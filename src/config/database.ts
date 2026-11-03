import pg from 'pg'
const { Pool, Client } = pg


export const pool = new Pool({
  host: 'pg-300bcd09-ds-jt808-parser-f60a.a.aivencloud.com',
  port: 22410,
  user: 'avnadmin',
  password: 'AVNS_T2PdsjQ5AnKjEItrY19',
  database: 'defaultdb',
});
