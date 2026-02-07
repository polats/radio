import { builder } from '../builder.js'
import { AgentType, AuthPayloadType, NoncePayloadType } from '../types/agent.js'
import { generateNonceMessage, verifyAuthSignature } from '../../auth/verify.js'
import { generateToken } from '../../auth/jwt.js'

// Get nonce for signing
builder.queryField('getNonce', (t) =>
  t.field({
    type: NoncePayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
    },
    resolve: (_parent, { walletAddress }) => {
      return generateNonceMessage(walletAddress.toLowerCase())
    },
  })
)

// Register a new agent
builder.mutationField('register', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
      signature: t.arg.string({ required: true }),
      message: t.arg.string({ required: true }),
      displayName: t.arg.string({ required: false }),
      avatarUrl: t.arg.string({ required: false }),
      soulMd: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const walletAddress = args.walletAddress.toLowerCase()
      
      // Verify signature
      const verification = verifyAuthSignature(args.message, args.signature, walletAddress)
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid signature')
      }
      
      // Check if agent already exists
      const existing = await context.prisma.agent.findUnique({
        where: { walletAddress }
      })
      if (existing) {
        throw new Error('Agent already registered')
      }
      
      // Create agent
      const agent = await context.prisma.agent.create({
        data: {
          walletAddress,
          displayName: args.displayName,
          avatarUrl: args.avatarUrl,
          soulMd: args.soulMd,
        }
      })
      
      // Generate token
      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress,
      })
      
      return { token, agent }
    },
  })
)

// Authenticate existing agent
builder.mutationField('authenticate', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
      signature: t.arg.string({ required: true }),
      message: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const walletAddress = args.walletAddress.toLowerCase()
      
      // Verify signature
      const verification = verifyAuthSignature(args.message, args.signature, walletAddress)
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid signature')
      }
      
      // Find agent
      const agent = await context.prisma.agent.findUnique({
        where: { walletAddress }
      })
      if (!agent) {
        throw new Error('Agent not found. Please register first.')
      }
      
      // Generate token
      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress,
      })
      
      return { token, agent }
    },
  })
)

// Guest login - creates a temporary agent with a random wallet
builder.mutationField('loginAsGuest', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      displayName: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      // Generate a random guest wallet address
      const randomHex = [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      const guestWallet = `0xguest${randomHex.slice(0, 34)}`
      
      // Create guest agent
      const agent = await context.prisma.agent.create({
        data: {
          walletAddress: guestWallet,
          displayName: args.displayName || `Guest ${randomHex.slice(0, 6)}`,
        }
      })
      
      // Generate token
      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress,
      })
      
      return { token, agent }
    },
  })
)
