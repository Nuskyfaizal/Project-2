const mongoose = require('mongoose');
const _ = require('lodash');
const { reject } = require('lodash');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const jwtSecret = "10588188246647038773jalyr9205602082"

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required:true,
        minlength: 5,
        lowercase:true,
        trim:true,
        unique:true
    },
    password:{
        type: String,
        required:true,
        minlength: 8
    },
//session objects contain a refresh token and its expiry DateTime
    sesions: [{
        token:{
            type:String,
            required: true
        },
        expiresAt:{
            type: Number,
            required: true
        }
    }]
});

// *** Instance Methods ***
UserSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();

    //return the document except the password and sessions (these shoudn't be made available)
    //npm i lodash
    return _.omit(userObject, ['password','session']);
}

UserSchema.methods.generateAccessAuthToken = function () {
    const user = this;
    return new Promise((resolve, reject) => {
        //Create the JSON web Token and return that
        //npm install jsonwebtoken
        //generate some random strings fo jwtSecret
        jwt.sign({ _id: user._id.toHexString() }, jwtSecret, { expiresIn: "15m" }, (err, token) =>{
            if (!err) {
                resolve(token);
            } else {
                reject();
            }
        });
    });
}

UserSchema.methods.generateRefreshAuthToken = function() {
    //this method simply generate a 64byte hex string - it doesnt save it to the database. saveSessionToDataBase() does that

    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (!err) {
                let token = buf.toString('hex');

                return resolve(token);
            }
        });
    });
}

UserSchema.methods.createSession = function() {
    let user = this;

    return user.generateRefreshAuthToken().then((refreshToken) => {
        return saveSessionToDataBase(user, refreshToken);
    }).then((refreshToken) => {
        //saved to database successfully
        //now return the refresh token
        return refreshToken;
    }).catch((e) => {
        return Promise.reject('Failed to save session to database. \n' + e);
    });
}

// *** MODEL METHODS (static methods) ***

UserSchema.statics.getJWTSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function(_id, token) {
    //finds user by id and token
    //used in auth middleware (verifySession)

    const User = this;

    return User.findOne({
        _id,
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function(email, password) {
    let user = this;

    return user.findOne({ email }).then((user) => {
        if(!user) return Promise.reject();

        return new Promise((resolve, reject) => {
            bcrypt.compare((password, user.password, (err, res) => {
                if (res){
                    resolve(user)
                } else{
                    reject();
                }
            }));
        });
    });
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
        //hasn't expired
        return false;
    } else {
        //has expired
        return true;
    }
}

/* MIDDLEWARE*/
//Before a user document is saved,this code runs
UserSchema.pre('save', function (next) {
    let user = this;
    //npm install bcryptjs

    let costFactor = 10;

    if(user.isModified('password')) {
        //if the password field has been edited/changed then run this code

        //generate salt and hash password
        bcrypt.genSalt(costFactor, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});


// *** HELPER METHODS ***
//session = Refresh token + Expiry Time
let saveSessionToDataBase = (user, refreshToken) => {
    //save ssession to database
    return new Promise((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();

        user.sessions.push({ "token": refreshToken, expiresAt});

        user.save().then(() => {
            //saved session successfully
            return resolve(refreshToken);
        }).catch((e) => {
            reject(e);
        });
    });
}

let generateRefreshTokenExpiryTime = () => {
    let daysUntilExpire = "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now() / 1000) + secondsUntilExpire);
}


const User = mongoose.model('User', UserSchema);


