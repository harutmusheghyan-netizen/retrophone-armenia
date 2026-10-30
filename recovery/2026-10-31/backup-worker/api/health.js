import pg from 'pg';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({ok:false});
 if(!process.env.DATABASE_URL) return res.status(503).json({ok:false,stage:'configuration'});
 const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:5000,query_timeout:5000});
 try {await client.connect();await client.query('SELECT 1');return res.status(200).json({ok:true,stage:'database_connection',backup_created:false});}
 catch(e){return res.status(503).json({ok:false,stage:'database_connection',backup_created:false});}
 finally{await client.end().catch(()=>{});}
}
