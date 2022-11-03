const express = require("express");
const app = express();
const mongoose = require('./db/mongoose');
const bodyParser = require('body-parser');

//load in the mongoose model
const { List } = require('./db/models/list.model');
const { Task } = require('./db/models/task.model');
const { User } = require('./db/models/user');

/**MIDDLEWARES */
app.use(bodyParser.json());

//Cors middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    res.header('Access-Control-Expose-Header', 'x-access-token');
    
    next();
});

// verify refresh token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}

/***END OF MIDDLEWARE */

//
app.get('/', (req,res) => {
    res.send("Hello World");
});

app.get('/lists', (req,res) => {
    //we want to return an array of all the lists in the database
    List.find({}).then((lists) => {
        res.send(lists);
    }).catch((e) => {
        res.send(e);
    });
});

app.post('/lists', (req,res) => {
    //we want to create a ne lit and return the new list document back to th user(incl. id)
    //the list information (fields) will be passed in via the json request body

    let newList = new List({
        title:req.body.title
    });
    newList.save().then((listDoc) => {
        //the full list document is returned (incl id)
        res.send(listDoc);
    });
});

app.put('/lists/:id', (req,res) => {
    List.findOneAndUpdate({_id:req.params.id}, { $set: req.body})
    .then(() => {
        res.sendStatus(200);
    });
});

app.delete('/lists/:id', (req,res) => {
    List.findOneAndRemove({_id:req.params.id})
    .then((removedDoc) => {
        res.send(removedDoc);
    });
});

/****************routes for task****************/

app.get('/lists/:listID/tasks', (req,res) => {
    Task.find({
        _listId: req.params.listID
    }).then((tasks) => {
        res.send(tasks);
    }).catch((e) => {
        res.send(e.messege);
    });
});

app.get('/lists/:listID/tasks/:taskId', (req,res) => {
    Task.findOne({
        _id:req.params.taskId,
        _listId:req.params.listID
    }).then((tasks) => {
        res.send(tasks);
    });
});

app.post('/lists/:listID/tasks', (req,res) => {
    let task = new Task({
        title:req.body.taskTitle,
        _listId: req.params.listID
    });
    task.save().then((taskDoc) => {
        res.send(taskDoc);
    }).catch((e) => {
        res.send(e.messege);
    });
});

app.put('/lists/:listID/tasks/:taskId', (req,res) => {
    Task.findOneAndUpdate(
        {_id:req.params.taskId, _listId : req.params.listID},
        {$set:req.body})
        .then(() => {
        res.send({messege: "Updated Successfully"});
    });
});

app.delete('/lists/:listID/tasks/:taskId',(req,res) => {
    Task.findOneAndDelete({_id:req.params.taskId, _listId:req.params.listID})
    .then((removedDoc) => {
        res.send(removedDoc);
    });
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});


/*********USER ROUTES********** */
app.post('/users', (req,res) => {
    //user sign up

    let newUser = new User(req.body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        //session created successfully - refreshToken returned
        //now we generate an access with token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            //access auth token generated successfully, now we return an object containing the auth tokens
            return {accessToken, refreshToken}
        });
    }).then((authTokens) => {
        //now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res 
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    });
});

app.post("/users/login", (req, res) => {
  //user login purpose

  let email = req.body.email;
  let password = req.body.password;

  User.findByCredentials(email, password).then((user) => {
    return user
      .createSession()
      .then((refreshToken) => {
        //session created successfully - refreshToken returned
        //now we generate an access auth token for the user

        return user.generateAccessAuthToken().then((accessToken) => {
          //access auth token generated successfully, now we return an object containing the auth tokens
          return { accessToken, refreshToken };
        });
      })
      .then((authTokens) => {
        //now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
          .header("x-refresh-token", authTokens.refreshToken)
          .header("x-access-token", authTokens.accessToken)
          .send(user);
      })
      .catch((e) => {
        res.status(400).send(e);
      });
  });
});

app.get('/users/me/access-token', verifySession, (req,res) => {
    //we know tha the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
});