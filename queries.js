const { Pool, Client } = require('pg');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const isProduction = process.env.NODE_ENV == 'production'
const connectionString = `postgresql://${process.env.USER}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.DBPORT}/${process.env.DATABASE}`
const pool = new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    ssl: {
        rejectUnauthorized: false
      }
    // ssl: isProduction
  })

const getUsers = async (req, res) => {
    
    let email = req.body.email.toLowerCase();
    let submittedPass = req.body.password;

    try {
        query = {
            text: 'select * from users where email = $1',
            values: [email],
        }
        const { rows } = await pool.query(query);
            
        if (rows.length > 0) {
            
            let foundPass = rows[0].password;
            const passwordMatch = await bcrypt.compare(submittedPass, foundPass);
            
            // if passwords match, redirect to messages
            if (passwordMatch) {
                
                req.session.email = email;
                
                res.redirect('/messages');

            // if they don't match, redirect to login
            } else {
                errors = [{
                    msg: 'Incorrect password, try again!'
                }]
                res.render('user', {
                    login: true,
                    layout: 'home',
                    error: errors
                })                
            }

        // if no email registered, redirect to register
        } else {
            errors = [{
                    msg: 'Email not registered, please create an account.'
                }]
                res.render('user', {
                    login: true,
                    layout: 'home',
                    error: errors
                })
        }
    // if error, redirect to home
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
}

const registerUser = async (req, res) => {
    try{    
        const email = req.body.email.toLowerCase();
        const password = req.body.password;        
        const hashPassword = await bcrypt.hash(password, 10)
        
        query = {
            text: 'select * from users where email = $1',
            values: [req.body.email],
        }

        const { rows } = await pool.query(query)
        
        if(rows.length === 0) {        
            query = {
                text: 'INSERT INTO users (email, password) VALUES ($1, $2)',
                values: [email, hashPassword],
            }
            req.session.email = email;
            pool.query(query)
                .then(() => res.redirect('/messages'))
                .catch(err => console.error(err));
        } else { 
            errors = [{
                msg : "Email in use already, try again!"
            }]
            res.render('user', {
                register: true,
                layout: 'home',
                error: errors
            })            
        }
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
}

const getMessages = async (req, res) => {

    query = {
        text: 'select id, email, message, to_char(time, $1) as time from messages;',
        values: ["MM/DD/YYYY HH:MI AM"]
    }
    
    const { rows } = await pool.query(query);
    
    if (rows.length > 0) {
        rows.forEach(result => {
            result['email_match'] = result['email'] === req.session.email;       
        })
        res.render('chats', {
            chats: rows
        })
    } else {
        res.render('chats');
    }
}

const addMessage = async (email, message) => {
    query = {
        text: 'INSERT INTO messages (email, message, time) VALUES ($1, $2, NOW());',
        values: [email, message]
    }

    pool.query(query)
    .catch(err => console.error(err));
}
module.exports = {
    getUsers,
    registerUser,
    getMessages,
    addMessage
}