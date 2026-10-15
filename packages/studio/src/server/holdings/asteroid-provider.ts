import { toBaseUnits, type HoldingsProvider, type Requirement } from "./types";

/**
 * Holdings from an Asteroid Protocol indexer (Hasura GraphQL).
 *
 * Asteroid's public API (`api.asteroidprotocol.io`) no longer resolves, so this
 * targets whatever endpoint `ASTEROID_GRAPHQL_URL` names — a self-hosted
 * indexer (github.com/asteroidprotocol/asteroid-protocol) or a third party
 * exposing the same schema:
 *
 *   token_holder(address, amount, token_id) → token(ticker, decimals)
 *   inscription(current_owner, collection_id) → collection(symbol)
 *
 * Amounts are stored in base units; `token.decimals` converts the gate's
 * display-unit minimum.
 *
 * Untested against a live indexer — written from Asteroid's published Hasura
 * metadata. Check the relationship names (`token`, `collection`) against your
 * endpoint before relying on it.
 */

const CFT20_QUERY = `
  query Cft20Balance($address: String!, $ticker: String!) {
    token_holder(
      where: { address: { _eq: $address }, token: { ticker: { _ilike: $ticker } } }
      limit: 1
    ) {
      amount
      token { ticker decimals }
    }
  }
`;

const INSCRIPTION_QUERY = `
  query OwnsFromCollection($address: String!, $collection: String!) {
    inscription(
      where: {
        current_owner: { _eq: $address }
        collection: { symbol: { _eq: $collection } }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export class AsteroidHoldingsProvider implements HoldingsProvider {
  readonly name = "asteroid";

  constructor(
    private readonly endpoint: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Asteroid indexer returned ${res.status}`);

    const body = await res.json();
    if (body.errors?.length) throw new Error(`Asteroid indexer: ${body.errors[0].message}`);
    return body.data as T;
  }

  async meets(address: string, requirement: Requirement): Promise<boolean> {
    if (requirement.type === "inscription") {
      if (!requirement.collection) return false;
      const data = await this.query<{ inscription: unknown[] }>(INSCRIPTION_QUERY, {
        address,
        collection: requirement.collection,
      });
      return data.inscription.length > 0;
    }

    if (!requirement.ticker) return false;
    const data = await this.query<{
      token_holder: { amount: string | number; token: { decimals: number } }[];
    }>(CFT20_QUERY, { address, ticker: requirement.ticker });

    const holding = data.token_holder[0];
    if (!holding) return false;

    const balance = BigInt(String(holding.amount).split(".")[0]);
    return balance >= toBaseUnits(requirement.minAmount, holding.token.decimals);
  }
}
