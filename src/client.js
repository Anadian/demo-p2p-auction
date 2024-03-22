#!/usr/bin/env node
/**
# [client.js](source/client.js)
> A simple client for interacting with the p2p swarm.

Author: Anadian

Code license: MIT
```
	Copyright 2022 Anadian
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
	import HyperswarmRPC from '@hyperswarm/rpc';
	import HyperCore from 'hypercore';
	import HyperBee from 'hyperbee';
//# Constants
const FILENAME = 'client.js';
//## Errors

//# Global Variables
/**## Functions*/
/**
### Client
> A simple client for interacting with the p2p swarm.
#### Parametres
| name | type | description |
| --- | --- | --- |
| options | object? | Additional options to pass to the smart constructor. |

##### Options Properties
| name | type | description |
| --- | --- | --- |
| packageMeta | PackageMeta? | An instance of [simple-package-meta](https://github.com/Anadian/simple-package-meta) to be used by this instance and any subclasses initialised along with it. |
| logger | object? | The logger to be used by this instance. |
| config | ConfigManager? | The [cno-config-manager] instance to be used by the created instance. |

#### Throws
| code | type | condition |
| --- | --- | --- |
| 'ERR_INVALID_ARG_TYPE' | TypeError | Thrown if `options` is neither an object nor `null` |

#### History
| version | change |
| --- | --- |
| 0.0.0 | Introduced |
*/
export default function Client( options = {} ){
	if( !( this instanceof Client ) ){
		return new Client( options );
	}
	const FUNCTION_NAME = 'Client';
	this.keypair_object = HyperDHT.keyPair(new Uint8Array(32));
	console.log( this.keypair_object );
	this.dht_node = new HyperDHT( {
		keyPair: this.keypair_object
	} );
	console.log( this.dht_node );
	this.connection = this.dht_node.connect( this.keypair_object.publicKey );
	this.connection.once( 'open', () => {
		console.log( 'Connected.' );
	} );
	return this;
}

var client = new Client();
