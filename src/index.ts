/*
   Copyright 2022 MFDLABS Ops <ops@vmminfra.net>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
	File Name: index.ts
	Description: The main export point for this package.
	Written by: MFDLABS Ops
*/

/**
 * Always use jsdoc style comments for public APIs, as these
 * are useful for clients directly consuming your package.
 *
 * Returns a string that says "Hello, World!"
 * @returns {string} A hello world string
 */
export function hello_world(): string {
  return 'Hello, World!';
}
