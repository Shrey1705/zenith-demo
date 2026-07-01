// Redis-backed implementation of the same six-function DB-shaped interface
// as memoryStore.js (see schema.sql for the reference DDL). Needed because
// serverless invocations don't share process memory — a proposal created in
// one request must be readable by the next request, which may land on a
// different instance.
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

const proposalKey = (id) => `proposal:${id}`;
const linkKey = (token) => `link:${token}`;
const PROPOSAL_INDEX = 'proposals:index';

const newId = async (p) => {
  const n = await redis.incr(`seq:${p}`);
  return `${p}${Date.now().toString(36).toUpperCase()}${n.toString(36).toUpperCase()}`;
};

const saveProposal = async (p) => {
  await redis.set(proposalKey(p.proposal_id), p);
  await redis.sadd(PROPOSAL_INDEX, p.proposal_id);
  return p;
};

const getProposal = async (id) => (await redis.get(proposalKey(id))) || null;

const listProposals = async (filter = {}) => {
  const ids = await redis.smembers(PROPOSAL_INDEX);
  if (!ids.length) return [];
  const all = await redis.mget(...ids.map(proposalKey));
  return all.filter(Boolean).filter(p => !filter.agent_code || p.agent_code === filter.agent_code);
};

const saveLink = async (l) => {
  await redis.set(linkKey(l.token), l);
  return l;
};

const getLink = async (token) => (await redis.get(linkKey(token))) || null;

module.exports = { newId, saveProposal, getProposal, listProposals, saveLink, getLink };
