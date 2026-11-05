const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 5002;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const seed = {
  users: [],
  books: [
    {id:1,title:'The Alchemist',author:'Paulo Coelho',category:'Fiction',price:180,condition:'Like New',owner:'Aarav',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900&auto=format&fit=crop&q=85',description:'A beautiful story about following your dreams.'},
    {id:2,title:'Introduction to Algorithms',author:'Cormen et al.',category:'Computer Science',price:450,condition:'Good',owner:'Meera',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=900&auto=format&fit=crop&q=85',description:'A useful reference for computer science readers.'},
    {id:3,title:'Atomic Habits',author:'James Clear',category:'Self Help',price:250,condition:'Like New',owner:'Rahul',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&auto=format&fit=crop&q=85',description:'Small habits, remarkable results.'},
    {id:4,title:'Engineering Mathematics',author:'B. S. Grewal',category:'Engineering',price:320,condition:'Used',owner:'Ananya',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&auto=format&fit=crop&q=85',description:'A student-friendly mathematics textbook.'},
    {id:5,title:'Clean Code',author:'Robert C. Martin',category:'Computer Science',price:390,condition:'Good',owner:'Kiran',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=900&auto=format&fit=crop&q=85',description:'Practical principles for writing better software.'},
    {id:6,title:'Wings of Fire',author:'A. P. J. Abdul Kalam',category:'Biography',price:150,condition:'Good',owner:'Sana',ownerId:0,status:'Available',image:'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&auto=format&fit=crop&q=85',description:'An inspiring autobiography.'}
  ],
  purchases: [], wishlist: [], requests: []
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  for (const key of ['users','books','purchases','wishlist','requests']) if (!Array.isArray(db[key])) db[key] = [];
  return db;
}
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'nexswap-local-session-secret-change-before-deploy',
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*24*60*60*1000}
}));
app.use(express.static(path.join(__dirname,'public')));
const auth=(req,res,next)=>req.session.user?next():res.status(401).json({error:'Please log in first.'});
const clean=(v,max=300)=>String(v??'').trim().slice(0,max);
const validAddress=(a)=>a && ['fullName','phone','line1','city','state','pincode'].every(k=>clean(a[k],120)) &&
  /^[0-9+\-\s()]{7,18}$/.test(clean(a.phone,30)) && /^[0-9]{5,10}$/.test(clean(a.pincode,12));

app.get('/api/books',(req,res)=>{const db=readDB();res.json(db.books.filter(b=>b.status==='Available'));});
app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));
app.post('/api/register',async(req,res)=>{
  const name=clean(req.body.name,80),email=clean(req.body.email,160).toLowerCase(),password=String(req.body.password||''),location=clean(req.body.location,80);
  if(!name||!email||!password)return res.status(400).json({error:'Please fill all required fields.'});
  if(password.length<6)return res.status(400).json({error:'Password must be at least 6 characters.'});
  const db=readDB();if(db.users.some(u=>u.email===email))return res.status(409).json({error:'Email already registered.'});
  const user={id:Date.now(),name,email,location,password:await bcrypt.hash(password,10)};
  db.users.push(user);writeDB(db);req.session.user={id:user.id,name:user.name,email:user.email,location:user.location};res.json({user:req.session.user});
});
app.post('/api/login',async(req,res)=>{
  const email=clean(req.body.email,160).toLowerCase(),password=String(req.body.password||''),db=readDB();
  const user=db.users.find(u=>u.email===email);
  if(!user||!(await bcrypt.compare(password,user.password)))return res.status(401).json({error:'Incorrect email or password.'});
  req.session.user={id:user.id,name:user.name,email:user.email,location:user.location};res.json({user:req.session.user});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/dashboard',auth,(req,res)=>{
  const db=readDB(),id=req.session.user.id;
  res.json({
    listings:db.books.filter(b=>b.ownerId===id),
    purchases:db.purchases.filter(p=>p.buyerId===id),
    wishlist:db.wishlist.filter(w=>w.userId===id),
    requests:db.requests.filter(r=>r.fromId===id||r.toId===id)
  });
});
app.post('/api/books',auth,(req,res)=>{
  const title=clean(req.body.title,140),author=clean(req.body.author,120);
  if(!title||!author)return res.status(400).json({error:'Title and author are required.'});
  const db=readDB(),b={
    id:Date.now(),title,author,category:clean(req.body.category,60)||'Other',
    price:Math.max(0,Number(req.body.price)||0),condition:clean(req.body.condition,30)||'Good',
    image:clean(req.body.image,600)||'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900',
    description:clean(req.body.description,1000),owner:req.session.user.name,ownerId:req.session.user.id,status:'Available'
  };
  db.books.unshift(b);writeDB(db);res.json(b);
});
app.post('/api/wishlist/:id',auth,(req,res)=>{
  const db=readDB(),id=Number(req.params.id),uid=req.session.user.id;
  if(!db.books.some(b=>b.id===id))return res.status(404).json({error:'Book not found.'});
  const exists=db.wishlist.some(w=>w.userId===uid&&w.bookId===id);
  db.wishlist=exists?db.wishlist.filter(w=>!(w.userId===uid&&w.bookId===id)):[...db.wishlist,{userId:uid,bookId:id}];
  writeDB(db);res.json({saved:!exists});
});
app.post('/api/buy/:id',auth,(req,res)=>{
  const db=readDB(),id=Number(req.params.id),book=db.books.find(b=>b.id===id);
  if(!book||book.status!=='Available')return res.status(400).json({error:'This book is no longer available.'});
  if(book.ownerId===req.session.user.id)return res.status(400).json({error:'You cannot order your own listing.'});
  const address=req.body.address;
  if(!validAddress(address))return res.status(400).json({error:'Please enter a valid delivery address, phone number and PIN code.'});
  const order={
    id:Date.now(),bookId:id,title:book.title,author:book.author,image:book.image,price:book.price,
    buyerId:req.session.user.id,buyer:req.session.user.name,seller:book.owner,
    address:{fullName:clean(address.fullName,100),phone:clean(address.phone,30),line1:clean(address.line1,180),line2:clean(address.line2,180),city:clean(address.city,80),state:clean(address.state,80),pincode:clean(address.pincode,12),instructions:clean(address.instructions,300)},
    date:new Date().toISOString(),status:'Order requested'
  };
  db.purchases.unshift(order);
  // Keep the listing available until the seller confirms the request.
  writeDB(db);res.json({ok:true,orderId:order.id});
});
app.post('/api/exchange/:id',auth,(req,res)=>{
  const db=readDB(),id=Number(req.params.id),book=db.books.find(b=>b.id===id);
  if(!book||book.status!=='Available')return res.status(400).json({error:'This book is no longer available for exchange.'});
  if(book.ownerId===req.session.user.id)return res.status(400).json({error:'You cannot exchange your own listing.'});
  const offeredBook=clean(req.body.offeredBook,140),message=clean(req.body.message,600);
  if(!offeredBook)return res.status(400).json({error:'Please enter the book you want to offer.'});
  const request={id:Date.now(),bookId:id,bookTitle:book.title,bookImage:book.image,owner:book.owner,fromId:req.session.user.id,fromName:req.session.user.name,fromEmail:req.session.user.email,toId:book.ownerId,offeredBook,message,date:new Date().toISOString(),status:'Pending'};
  db.requests.unshift(request);writeDB(db);res.json({ok:true,requestId:request.id});
});
app.listen(PORT,()=>console.log(`NexSwap is running at http://localhost:${PORT}`));
