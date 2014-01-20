var events = require('events');
var wormhole = function (socket) {
	events.EventEmitter.call(this);
	this.isWormhole = null;
	this.setupListeners();
	this.setSocket(socket);

	this._availablerpc = {};
	this.rpc = {};

	this.__hashes__ = [];
	this.__hash__ = "";

	this.addFunctions(wormhole.builder.__rpcFunctions);
};
wormhole.prototype.__proto__ = events.EventEmitter.prototype;
wormhole.prototype.setSocket = function(socket) {
	this.socket && this.socket.removeAllListeners();
	this.socket = socket;
	this.setupSocketListeners();
};
wormhole.prototype.isWormhole = function(cb) {
	var self = this;
	if (this.isWormhole === null) {
		this.socket.emit("isWormhole", function (err, isWormhole) {
			if (!err) {
				self.isWormhole = isWormhole;
			} else {
				self.isWormhole = !!isWormhole;
			}
		});
	} else {
		cb(null, isWormhole);
	}
};
wormhole.prototype.setupListeners = function() {
	var self = this;
	this.on("outofsync", self.syncFunctions);
	this.on("rpc", function () {
		var args = [].slice.call(arguments);
		var func = args.shift();
		var cb;
		if (typeof args[args.length-1] == "function") {
			// It's a callback function.
			// We may need to callback a timeout.
			cb = args[args.length-1];
		}
		if (self._availablerpc[func]) {
			self._availablerpc[func].apply(self, args);
		} else {
			cb && cb("nosuchmethod", func);
		}
	});
	this.on("newListener", function (event, func) {
		if (event != "removeListener" && event != "newListener") {
			// Oh, this is an RPC, Add the fucker!
			self.addFunction(event, func);
		}
	});
};
wormhole.prototype.setupSocketListeners = function() {
	var self = this;
	//Original func
	this.socket.on("isWormhole", function (cb) {
		cb(null, true);
		self.syncFunctions();
	});
	this.socket.on("disconnect", function () {
		self.removeAllListeners();
	});
	this.socket.on("rpc", function (signature) {
		var args = [].slice.call(data);
		args.shift();
		var cb;
		if (typeof args[args.length-1] == "function") {
			// It's a callback function.
			// We may need to callback a timeout.
			cb = args[args.length-1];
		}
		if (signature && signature.__hash__) {
			// It's a wormhole rpc signature.
			if (signature.__hash__ != self.__hash__) {
				self.emit("outofsync", signature.__hash__);
				cb && cb("outofsync");
			} else {
				self.emit.apply(self, ["rpc"].concat(args));
			}
		}
	});
};
wormhole.prototype.addFunction = function(func, cb) {
	this._availablerpc[func] = cb;
	var str = Object.keys(this._availablerpc).join("");
	// Simple RPC versioning.
	this.__hash__ = new Buffer(str).toString('base64');
	this.__hashes__.push({hash: this.__hash__, name: func});
};
wormhole.prototype.addFunctions = function (obj) {
	for (var i in obj) {
		this.addFunction(i, obj[i]);
	}
};
wormhole.prototype.syncFunctions = function(oldhash) {
	if (oldhash) {
		var changes = this.__changes__(oldhash);
		this.socket.emit("functions", changes);
	} else {
		this.socket.emit("functions", Object.keys(this._availablerpc));
	}
};
wormhole.prototype.__addClientFunction__ = function(func) {
	var self = this;
	this.rpc[func] = function () {
		var args = ["rpc", func].concat([].slice.call(arguments));
		self.socket.emit.apply(self, args);
	};
};
wormhole.prototype.__changes__ = function(hash) {
	var out = [];
	var keys = Object.keys(this.__hashes__);
	for (var i = keys.length; i >= 0; i--) {
		// Reverse traverse, most likely they'll have a more-or-less up to date stash.
		if (keys[i].hash === hash) {
			break;
		}
		out.push(keys[i].name);
	}
	return out;
};

var wormholeBuilder = function () {
	this.__rpcFunctions = {};
};

// Use me to store access to functions available to every wormhole client.
wormholeBuilder.prototype.setFunctions = function (obj) {
	for (var i in obj) {
		this.__rpcFunctions[i] = obj[i];
	}
};
var builder = new wormholeBuilder();
wormhole.builder = builder;
module.exports = wormhole;