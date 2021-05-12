const express = require('express');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const exphbs = require('express-handlebars');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const db = require('./queries.js');
const sharedSession = require('express-socket.io-session');
const redis = require('redis');
const { runInNewContext } = require('vm');
const redisClient = redis.createClient(process.env.REDIS_URL);
const redisStore = require('connect-redis')(session);
require('dotenv').config();


redisClient.on('error', err => {
    console.log('Redis error: ', err);
})
const TWO_HOURS = 1000 * 60 * 60 * 2;

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.engine('hbs', exphbs({
    defaultLayout: 'base',
    extname: 'hbs'
}));

app.set('view engine', 'hbs');

const {
    PORT = process.env.PORT,
    SESS_LIFETIME = TWO_HOURS,
    NODE_ENV = process.env.NODE_ENV,
    SESS_NAME = process.env.SESS_NAME,
    SESS_SECRET = process.env.SESS_SECRET
} = process.env



const IN_PROD = NODE_ENV === 'production';

let sess = {
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
        maxAge: SESS_LIFETIME,
        sameSite: true,
        secure: IN_PROD
    }, 
    // store: new redisStore({ host: process.env.HOST, port: 6379, client: redisClient, ttl: 86400 }),

}

const thisSession = session(sess);
app.use(thisSession);

io.use((socket, next) => {
    thisSession(socket.request, {}, next);
})

const redirectLogin = (req, res, next) => {   
    console.log(req.session)
    if (!req.session.email) {
        res.redirect('/');
    } else {
        next(); 
    }
}

const bypassLogin = (req, res, next) => {
    if(req.session.email) {
        res.redirect('/messages');
    } else {
        next();
    }
}

const checkEmailPassword = [
    body('email', 'Username Must Be an Email Address').isEmail().trim().escape().normalizeEmail(),
    // check password
    body('password').isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters')
    .matches('[0-9]').withMessage('Password Must Contain a Number').matches('[A-Z]')
    .withMessage('Password Must Contain an Uppercase Letter').trim().escape(),
    function(req, res, next) {
        var errorValidation = validationResult(req);
        const route = req.route.path;
    
        let errors = errorValidation['errors']
        
        if (errors.length > 0) {
            if (route === '/login') {
                res.render('user', {
                    login: true,
                    layout: 'home',
                    error: errors
                })
            } else if (route === '/register') {
                res.render('user', {
                    register: true,
                    layout: 'home',
                    error: errors
                })
            }
        } else {
            next();
        }
    }

]

app.use(express.static('public'));

// serve base html file
app.get('/', bypassLogin, (req, res) => {
    
    res.render('user', {
        main: true,
        layout: 'home',
    })
})

app.get('/messages', redirectLogin, db.getMessages);

app.get('/login', (req, res) => {
    res.render('user', {
        login: true,
        layout: 'home',
    })    
})

app.post('/login', checkEmailPassword, db.getUsers)

app.get('/register',(req, res) => {
    res.render('user', {
        register: true,
        layout: 'home',
    })
});

app.post('/register', checkEmailPassword, db.registerUser);

const connections = {}

io.on('connection', socket => {
    let email = socket.request.session.email;
    if(connections[email]) {
        connections[email].push(socket.id);
    } else {
        connections[email] = [socket.id];
    }
        socket.on('chat', message => {        
        db.addMessage(email, message);      
        let id = socket.id;        
        io.emit('chat', connections[email], message);        
    }) 
})

app.get('/logout', (req, res) => {    
    req.session.destroy( (err) => {
        res.redirect('/');
    })
})

// tell server to listen on PORT
server.listen(PORT, () => {
    console.log(`Now listening on port: ${PORT}`);
})