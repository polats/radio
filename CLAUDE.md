## Railway
- Token in `.env` as `RAILWAY_TOKEN` — works with GraphQL API only, NOT the Railway CLI
- API endpoint: `https://backboard.railway.app/graphql/v2`
- Auth header: `Authorization: Bearer $RAILWAY_TOKEN`
- Custom domains require CNAME pointing to Railway's `requiredValue` (NOT the service domain), unproxied
