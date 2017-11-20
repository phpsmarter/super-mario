import Entity, {Sides, Trait} from '../Entity.js';
import Killable from '../traits/Killable.js';
import PendulumMove from '../traits/PendulumMove.js';
import {loadSpriteSheet} from '../loaders.js';

export function loadKoopa() {
    return loadSpriteSheet('koopa')
    .then(createKoopaFactory);
}

const STATE_WALKING = Symbol('walking');
const STATE_HIDING = Symbol('hiding');
const STATE_PANIC = Symbol('panic');

class Behavior extends Trait {
    constructor() {
        super('behavior');
        this.state = STATE_WALKING;

        this.hideTime = null;
        this.hideDuration = 5;

        this.panicSpeed = 300;
    }

    collides(us, them) {
        if (us.killable.dead) {
            return;
        }

        if (them.stomper) {
            if (them.vel.y > us.vel.y) {
                this.handleStomp(us, them);
                them.stomper.bounce(them, us);
            } else {
                this.handleNudge(us, them);
            }
        }
    }

    handleNudge(us, them) {
        if (this.state === STATE_WALKING) {
            them.killable.kill();
        } else if (this.state === STATE_HIDING) {
            us.pendulumMove.enabled = true;
            us.pendulumMove.speed = this.panicSpeed * Math.sign(them.vel.x);
            this.state = STATE_PANIC;
        } else if (this.state === STATE_PANIC) {
            const travelDir = Math.sign(us.vel.x);
            const impactDir = Math.sign(us.pos.x - them.pos.x);
            if (travelDir !== 0 && travelDir !== impactDir) {
                them.killable.kill();
            }
        }
    }

    handleStomp(us, them) {
        if (this.state === STATE_WALKING) {
            this.hide(us)
        } else if (this.state === STATE_HIDING) {
            us.killable.kill();
            us.canCollide = false;
            us.vel.set(100, -200);
        }
    }

    hide(us) {
        us.vel.x = 0;
        us.pendulumMove.enabled = false;
        this.hideTime = 0;
        this.state = STATE_HIDING;
    }

    unhide(us) {
        us.pendulumMove.enabled = true;
        this.state = STATE_WALKING;
    }

    update(us, deltaTime) {
        if (this.state === STATE_HIDING) {
            if (this.hideTime > this.hideDuration) {
                this.unhide(us);
            }
            this.hideTime += deltaTime;
        }
    }
}

function createKoopaFactory(sprite) {
    const walkAnim = sprite.animations.get('walk');

    function routeAnim(koopa) {
        if (koopa.behavior.state === STATE_HIDING || koopa.behavior.state === STATE_PANIC) {
            return 'hiding';
        }
        return walkAnim(koopa.lifetime);
    }


    function drawKoopa(context) {
        sprite.draw(routeAnim(this), context, 0, 0, this.vel.x < 0);
    }

    return function createKoopa() {
        const koopa = new Entity();
        koopa.size.set(16, 16);
        koopa.offset.y = 8;

        koopa.addTrait(new PendulumMove());
        koopa.addTrait(new Killable());
        koopa.addTrait(new Behavior());

        koopa.draw = drawKoopa;

        return koopa;
    };
}
