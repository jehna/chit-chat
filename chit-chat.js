Users = new Mongo.Collection("users");

if (Meteor.isClient) {
    
    var userID = window.localStorage.userID;
    if (!userID) {
        userID = Users.insert({
            position: {
                x: 230,
                y: 264
            }
        });
        window.localStorage.userID = userID;
    }
    
    var user = Users.findOne({ _id: userID });
    
    
    PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
    var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {backgroundColor : 0x1099bb, resolution: 2});
    
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
    
    window.document.addEventListener('mousedown', onDown);
    window.document.addEventListener('touchstart', onDown);

    function onDown (e) {
        Users.update({ _id: userID }, { position: { x: e.clientX, y: e.clientY } }, { upsert: true });
    }
    // start animating
    animate();
    
    Tracker.autorun(function () {
        var users = Users.find();
        users.forEach(function(user) {
            var id = user._id;
            var userSprite = getOrCreateUserWithId(id);
            userSprite.position.set(user.position.x, user.position.y);
        });
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
}
