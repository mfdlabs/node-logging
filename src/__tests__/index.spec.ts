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
	File Name: index.spec.ts
	Description: Default test specification for this package.
	Written by: MFDLABS Ops
*/

import { hello_world } from '..';

describe('default test', () => {
  describe('#hello_world', () => {
    it('should return a string', () => {
      expect(hello_world()).toBe('Hello, World!');
    });
  });
});
