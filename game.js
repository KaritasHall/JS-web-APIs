
/* Some default settings from Phaser. I wanted my game to
    be fullscreen so I dabbled with the width/height.
    The default version is 400x800*/
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth * window.devicePixelRatio,
    height: window.innerHeight * window.devicePixelRatio,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 300 },
        debug: false,
      },
    },
    /* Phaser bases a game on these three main functions:
      preload, create and update. The game is built on this
      structure as you will see below*/
    scene: {
      preload: preload,
      create: create,
      update: update,
    },
  };

  // Variables
  let player;
  let platforms;
  let cursors;
  let skulls;
  let score = 0;
  let scoreText;
  let dead = false;
  let hasPlayedDeathAnimation = false;

  /* Defining screen width/ height as variables so I can use them to style the assets*/
  const width = window.innerWidth * window.devicePixelRatio;
  const height = window.innerHeight * window.devicePixelRatio;

  /* This line runs the entire game. The Phaser.Game instance is the main controller for the entire Phaser game.
    It sets up all the Phaser systems behind the scenes.
    Once that is complete it will start the Scene Manager and then begin the main game loop.*/
  const game = new Phaser.Game(config);

  // PRELOAD - Preloading all assets
  function preload() {
    this.load.image("sky", "assets/sky.png");
    this.load.image("bottom", "assets/bottom.png");
    this.load.image("ground", "assets/platform.png");
    this.load.image("star", "assets/star.png");
    this.load.image("skull", "assets/pink-skellon.png");
    this.load.spritesheet("stars", "assets/star-anim.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("dude", "assets/dude.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("death", "assets/death.png", {
      frameWidth: 48,
      frameHeight: 32,
    });

    this.load.audio("star-audio", "/sounds/star.wav");
    this.load.audio("jump-audio", "/sounds/jump.wav");
    this.load.audio("update-audio", "/sounds/update.wav");
    this.load.audio("gameover-audio", "/sounds/gameover.wav");
  }

  // CREATE - Creating the objects that will be used (using preloaded assets)
  function create() {

    // Background
    this.background = this.add.image(width * 0.5, height * 0.5, "sky");
    this.background.displayWidth = width;
    this.background.displayHeight = height;

    // Sound effects
    this.starAudio = this.sound.add("star-audio");
    this.jumpAudio = this.sound.add("jump-audio");
    this.updateAudio = this.sound.add("update-audio");
    this.gameoverAudio = this.sound.add("gameover-audio");

    /* Making platforms. The "Group" method creates a group that stores a
      collection of similar objects. I'll be using it throughout for objects that come in multiples.
      Here the statc prefix means that this group will stay in place, no crazy physics.*/
    platforms = this.physics.add.staticGroup();

    platforms.create(width * 0.5, height -50, "bottom");

    platforms.create(900, 450, "ground");
    platforms.create(1300, 250, "ground");
    platforms.create(1600, 550, "ground");
    platforms.create(300, 350, "ground");
    platforms.create(600, 620, "ground");

    // Making the player
    player = this.physics.add.sprite(100, 450, "dude");
    player.setScale(2)

    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    player.body.setGravityY(300);

    /* Now we animate the player by using the frames from the sprite sheet.
    Phaser treats the sprite sheet like an array - starting from 0. It kind of works
    like a flipping pages really fast - it loops through the frames creating
    an effect of movement*/
    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "idle",
      frames: this.anims.generateFrameNumbers("dude", { start: 8, end: 13 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("dude", { start: 14, end: 21 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "die",
      frames: this.anims.generateFrameNumbers("death", { start: 0, end: 5 }),
      frameRate: 10,
    });


    // Making stars
     // Placing how many stars, where and how much spacing between them
     stars = this.physics.add.group({
      key: "stars",
      repeat: 13,
      setXY: { x: 120, y: 0, stepX: 120 },
    });

    // Animating stars
    this.anims.create({
      key: "star-anim",
      frames: this.anims.generateFrameNumbers("stars", { start: 0, end: 12 }),
      frameRate: 10,
      repeat: -1,
    });

    // Stars bounce when they drop and run animation
    stars.children.iterate(function (child) {
      child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
      child.anims.play("star-anim", true);
    });

    // Setting controls
    cursors = this.input.keyboard.createCursorKeys();

    // What objects collide off each other
    this.physics.add.collider(player, platforms);

    this.physics.add.collider(stars, platforms);

    // What objects overlap, the player "absorbs" stars instead of bouncing against them
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Creating the player score text
    scoreText = this.add.text(16, 16, "score: 0", {
      fontSize: "32px",
      fill: "#000",
      fontStyle: "bold"
    });

    // Creating "Game Over" text
    gameOverText = this.add.text(width * 0.5, 350, "Game Over", {
      fontSize: "96px",
      fontStyle: "bold",
      fill: "#00000",
    });
    gameOverText.setOrigin(0.5, 0.5);

    // Making "Game Over" text invisible until gameOver is true
    gameOverText.visible = false;

    // Evil skulls
    skulls = this.physics.add.group();

    this.physics.add.collider(skulls, platforms);

    this.physics.add.collider(player, skulls, hitSkull, null, this);
  }

  // UPDATE - the game loop
  function update() {

    /* Here we enable the player to move with keyboard arrows, and put to use the animations set up
    in the previous section. We also have to check if our player is dead. If player is not dead
      it can move left, right etc. If player IS dead the death animation sequence will run*/
    if (!dead && cursors.left.isDown) {
      player.setVelocityX(-160);
      player.anims.play("left", true);

    } else if (!dead && cursors.right.isDown) {
      player.setVelocityX(160);
      player.anims.play("right", true);

    } else if (!dead) {
      player.setVelocityX(0);
      player.anims.play("idle", true);

    } else if (!hasPlayedDeathAnimation) {
      hasPlayedDeathAnimation = true;
      player.setVelocityX(0);
      player.anims.play("die", true);
    }

    if (!dead && cursors.up.isDown && player.body.touching.down) {
      player.setVelocityY(-500);
      this.jumpAudio.play();
    }
  }

  /* Making a function for collecting stars. We want the star to disappear once it collides with player
    and for the star audio to play.*/
    function collectStar(player, star) {
    this.starAudio.play();
    star.disableBody(true, true);
    // A value of 10 gets added to the "score" variable and scoreText is updated
    score += 10;
    scoreText.setText("Score: " + score);


    // Once all stars are collected we "reset" the stars, getting more stars
    if (stars.countActive(true) === 0) {
      this.updateAudio.play();
      stars.children.iterate(function (child) {
        child.enableBody(true, child.x, 0, true, true);
      });

      // This is so the skull doesn't spawn directly above the player
      const x =
        player.x < 400
          ? Phaser.Math.Between(400, 800)
          : Phaser.Math.Between(0, 400);

      // We also create a new skull everytime the star update runs
      let skull = skulls.create(x, 16, "skull");
      skull.setBounce(1);
      skull.setCollideWorldBounds(true);
      skull.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
  }
  /* When player and skull collide, death animation/audio will run and gameOver is triggered.
    The "if" statement is a guarantee that the death event will only run once. Because once the "dead" variable becomes true
    it cannot become false again (in my coding scenario).
    Before when I was testing the game, the skull would sometimes bounce a few times against the
    player when caught at a weird angle -  that would cause the game over event to fire several times */
  function hitSkull(player) {
   if (!dead) {
      dead = true;
      this.gameoverAudio.play();

     player.setTint(0xff0000);

      // Show game over text
      gameOverText.visible = true;

     // Restart button
      const element = document.getElementById("restart-btn");
      element.classList.add('showbutton');

      gameOver = true;
    }
  }
   /* Restart game. This function is tied to
      the restart button in the html. I found that the simplest solution for restarting was
      to just refresh the browser. You probably could reset everything in the update loop
      but I didn't see a point.*/
   function restartGame() {
    window.location.reload()
   }

