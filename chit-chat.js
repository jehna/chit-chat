Users = new Mongo.Collection("users");

if (Meteor.isClient) {
    
    var userID = Users.insert({
        _id: Meteor.connection._lastSessionId,
        position: {
            x: 230,
            y: 264
        },
        color: Math.floor(Math.random()*0x666666) + 0x333333
    });
    user = Users.findOne({ _id: userID })
    
    
    PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
    var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {backgroundColor : 0x1099bb, resolution: 2});
    window.onresize = function(event) {
        renderer.resize(window.innerWidth, window.innerHeight);
    }
    
    setTimeout(function() {
        window.document.body.appendChild(renderer.view);
    },1);

    // create the root of the scene graph
    var stage = new PIXI.Container();
    var users = {};
    function getOrCreateUserWithId(id) {
        if(!users[id]) {
            var sprite = PIXI.Sprite.fromImage('assets/ducky.png');
            sprite.pivot.set(5,6);
            sprite.position.set(-100, -100);
            sprite.scale.x = sprite.scale.y = 5;
            stage.addChild(sprite);
            users[id] = sprite;
        }
        return users[id];
    }
    function removeUserWithIdNotIn(ids) {
        for(var id in users) {
            if(ids.indexOf(id) == -1) {
                var sprite = users[id];
                stage.removeChild(sprite);
                delete users[id];
            }
        }
    }
    
    window.document.addEventListener('mousedown', onDown);
    window.document.addEventListener('touchstart', onDown);

    function onDown (e) {
        user.position.x = e.clientX;
        user.position.y = e.clientY;
        Users.update({ _id: userID }, user);
    }
    // start animating
    animate();
    
    Tracker.autorun(function () {
        var users = Users.find();
        var alive_ids = [];
        users.forEach(function(user) {
            var id = user._id;
            alive_ids.push(id);
            var userSprite = getOrCreateUserWithId(id);
            userSprite.tint = user.color;
            userSprite.position.set(user.position.x, user.position.y);
        });
        removeUserWithIdNotIn(alive_ids);
    });
    
    function animate() {

        requestAnimationFrame(animate);

        // render the root container
        renderer.render(stage);
    }

}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
    });
    
    Meteor.onConnection(function(conn) {
        conn.onClose(function(id, close, onClose) {
            console.log("Colsing ", conn.id);
            Users.remove({_id: conn.id});
        });
    })
}
