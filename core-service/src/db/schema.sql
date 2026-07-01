-- ============================================================
-- Core policy DB schema (reference DDL — demo runs on in-memory
-- store with identical shape; swap to MongoDB/Postgres per env)
-- ============================================================
CREATE TABLE PROPOSAL (
  proposal_id    VARCHAR(24) PRIMARY KEY,
  channel        VARCHAR(8)  CHECK (channel IN ('D2C','AGENT')),
  agent_code     VARCHAR(16),
  status         VARCHAR(12) CHECK (status IN ('DRAFT','SUBMITTED','ISSUED')),
  pincode        CHAR(6)     NOT NULL,
  tenure_years   SMALLINT    CHECK (tenure_years IN (1,2,3)),
  sum_insured    BIGINT      NOT NULL,
  addons         TEXT,                -- JSON array of addon codes
  premium_total  INTEGER,
  payment_status VARCHAR(10) DEFAULT 'PENDING',  -- PENDING | PAID
  policy_no      VARCHAR(20)
);

CREATE TABLE PROPOSAL_MEMBER (
  member_id      VARCHAR(24) PRIMARY KEY,
  proposal_id    VARCHAR(24) REFERENCES PROPOSAL,
  relationship   VARCHAR(10) CHECK (relationship IN
    ('SELF','SPOUSE','SON','DAUGHTER','FATHER','MOTHER')),
  dob            DATE NOT NULL,
  ped_declared   BOOLEAN DEFAULT FALSE
);

CREATE TABLE NOMINEE (                 -- nullable link: optional at proposal
  proposal_id    VARCHAR(24) REFERENCES PROPOSAL,
  name           VARCHAR(80),
  relation       VARCHAR(20),
  dob            DATE
);

CREATE TABLE PAYMENT_LINK (
  token          VARCHAR(32) PRIMARY KEY,
  proposal_id    VARCHAR(24) REFERENCES PROPOSAL,
  amount         INTEGER,
  status         VARCHAR(10) DEFAULT 'ACTIVE'    -- ACTIVE | USED
);
