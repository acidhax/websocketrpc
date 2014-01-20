var events = require('events');
var wormhole = function (socket) {
	events.EventEmitter.call(this);
	this.isWormhole = null;
	this.setupListeners();
	this.setSocket(socket);

	this._rpc = {};
};
wormhole.prototype.__proto__ = events.EventEmitter.prototype;
wormhole.prototype.setSocket = function(socket) {
	this.socket && this.socket.removeAllListeners();
	this.socket = socket;
	this.setupSocketListeners();
};
wormhole.prototype.isWormhole = function(cb) {
	if (this.isWormhole === null) {
		this.socket.emit("isWormhole", function (err, isWormhole) {
			if (!err) {
				this.isWormhole = isWormhole;
			} else {
				this.isWormhole = !!isWormhole;
			}
		});
	} else {
		cb(null, isWormhole);
	}
};
wormhole.prototype.setupListeners = function() {
	// this.on("removeListener", this._unsubscribe);
	var self = this;
	this.on("newListener", function (event, func) {
		if (event != "removeListener" && event != "newListener") {
			// Oh, this is an RPC, Add the fucker!
			this._rpc[event] = func;
		}
	});
};
wormhole.prototype.setupSocketListeners = function() {
	this.socket.on("isWormhole", function (cb) {
		cb(null, true);
	});
};
wormhole.prototype.addFunction = function(func, cb) {
	this._rpc[func] = cb;
};
module.exports = wormhole;