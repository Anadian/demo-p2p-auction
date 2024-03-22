#!/usr/bin/env node
/**
# [server.js](source/server.js)
> A simple server for interacting with the p2p swarm.

Author: Anadian

Code license: MIT
```
	Copyright 2024 Anadian
	Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the "Software"), to deal in the Software 
without restriction, including without limitation the rights to use, copy, modify, 
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to 
permit persons to whom the Software is furnished to do so, subject to the following 
conditions:
	The above copyright notice and this permission notice shall be included in all copies 
or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
Documentation License: [![Creative Commons License](https://i.creativecommons.org/l/by-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-sa/4.0/)
> The source-code comments and documentation are written in [GitHub Flavored Markdown](https://github.github.com/gfm/).

*/

//# Dependencies
	//## Internal
	//## Standard
	import CryptoNS from 'node:crypto';
	//## External
	import HyperDHT from 'hyperdht';
//	import HyperswarmRPC from '@hyperswarm/rpc';
//	import HyperCore from 'hypercore';
//	import HyperBee from 'hyperbee';
//# Constants
const FILENAME = 'server.js';
//## Errors

//# Global Variables
/**## Functions*/
export default function Server( options = {} ){
	if( !( this instanceof Server ) ){
		return new Server( options );
	}
	const FUNCTION_NAME = 'Server';
	this.keypair_object = HyperDHT.keyPair(new Uint8Array(32));
	console.log( this.keypair_object );
	this.dht_node = new HyperDHT( {
		keyPair: this.keypair_object
	} );
	console.log( this.dht_node );
	this.dht_server = this.dht_node.createServer( connection_object => {
		console.log( 'Received: %o', connection_object );
	} );
	console.log( this.dht_server );
	this.listen_promise = this.dht_server.listen( this.keypair_object ).then(
		() => {
			console.log('Listening.');
		},
		null,
	);
	return this;
}

var server = new Server();
