const _ = require('lodash');
const {pool} = require('decorators');

const PERSISTENT = Symbol();

@pool({
	guard(instance) {
		return !instance.isPersistent();
	}
})
class FakeEvent {
	constructor(type, init) {
		_.assign(this, init);
		this.type = type;
		this[PERSISTENT] = false;
	}

	// stub
	preventDefault() {
	}

	// stub
	stopPropagation() {
	}

	persist() {
		this[PERSISTENT] = true;
	}

	isPersistent() {
		return this[PERSISTENT];
	}
}

module.exports = FakeEvent;
