// Only for fictional provider handler tests; real atomicity is tested in Postgres.
module.exports=async options=>({ok:true,status:200,json:async()=>({configured:true,remaining:100,allocated:0,revision:0,stopOn:'2099-01-01',expired:false,granted:JSON.parse(options.body).action==='reserve'?JSON.parse(options.body).amount:0})});
