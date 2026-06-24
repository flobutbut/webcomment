-- Replace directional unique (requester_id, addressee_id) with pair-based constraint
-- so that A→B and B→A cannot coexist even if inserted concurrently.
alter table contacts drop constraint contacts_unique;

create unique index contacts_unique_pair_idx
  on contacts (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
