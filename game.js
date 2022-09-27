

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
    scene: {
      preload: preload,
      create: create,
      update: update,
    },
  };

  let player;
  let platforms;
  let cursors;
  let bombs;
  let score = 0;
  let scoreText;

  const width = window.innerWidth * window.devicePixelRatio;
  const height = window.innerHeight * window.devicePixelRatio;

  const game = new Phaser.Game(config);

  // Preloading all assets
  function preload() {
    this.load.image("sky", "assets/sky.png");
    this.load.image("bottom", "assets/bottom.png");
    this.load.image("ground", "assets/platform.png");
    this.load.image("star", "assets/star.png");
    this.load.image("bomb", "assets/pink-skellon.png");
    this.load.spritesheet("stars", "assets/star-anim.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet("dude", "assets/dude.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.audio("star-audio", "/sounds/star.wav");
    this.load.audio("jump-audio", "/sounds/jump.wav");
    this.load.audio("update-audio", "/sounds/update.wav");
    this.load.audio("gameover-audio", "/sounds/gameover.wav");
  }

  // Creating the objects we will use
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

    // Making platforms
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


    // Making stars

    this.anims.create({
      key: "star-anim",
      frames: this.anims.generateFrameNumbers("stars", { start: 0, end: 12 }),
      frameRate: 10,
      repeat: -1,
    });


    stars = this.physics.add.group({
      key: "stars",
      repeat: 13,
      setXY: { x: 120, y: 0, stepX: 120 },
    });


    // Stars bounce when they drop
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

    // Making Game Over invisible until gameOver is true
    gameOverText.visible = false;

    // Bombs!
    bombs = this.physics.add.group();

    this.physics.add.collider(bombs, platforms);

    this.physics.add.collider(player, bombs, hitBomb, null, this);
  }

  // UPDATE - the game loop
  function update() {

    // Here we enable the player to move
    if (cursors.left.isDown) {
      player.setVelocityX(-160);

      player.anims.play("left", true);
    } else if (cursors.right.isDown) {
      player.setVelocityX(160);

      player.anims.play("right", true);
    } else {
      player.setVelocityX(0);

      player.anims.play("idle", true);
    }

    if (cursors.up.isDown && player.body.touching.down) {
      player.setVelocityY(-500);
      this.jumpAudio.play();
    }
  }

  // Making a function for collecting stars. Firt we want the star to disappear once it collides with player
  function collectStar(player, star) {
    this.starAudio.play();
    star.disableBody(true, true);
    // A value of 10 gets added to the "score" variable and scoreText is updated
    score += 10;
    scoreText.setText("Score: " + score);
    const x =
    player.x < 400
      ? Phaser.Math.Between(400, 800)
      : Phaser.Math.Between(0, 400);



    // Once all stars are collected we "reset" the stars, getting more stars
    if (stars.countActive(true) === 0) {
      this.updateAudio.play();
      stars.children.iterate(function (child) {
        child.enableBody(true, child.x, 0, true, true);
      });

      // This is so the bomb doesn't spawn directly above the player
      const x =
        player.x < 400
          ? Phaser.Math.Between(400, 800)
          : Phaser.Math.Between(0, 400);

      // We also create a bomb that is released with the star update
      let bomb = bombs.create(x, 16, "bomb");
      bomb.setBounce(1);
      bomb.setCollideWorldBounds(true);
      bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }
  }
  // When player and bomb collide, the player sprite is paused and gameOver is triggered
  function hitBomb(player, bomb) {
    this.gameoverAudio.play();
    this.physics.pause();

    player.setTint(0xff0000);
    player.anims.play("idle", true);

     // Show game over text
    gameOverText.visible = true;

    // Restart button
    const element = document.getElementById("restart-btn");
    element.classList.add('showbutton');

    gameOver = true;

  }
   // Restart game
   function restartGame() {
    window.location.reload()
   }

