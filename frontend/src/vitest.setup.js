// this file is doing some setup stuff needed in our unit tests. 

import { expect, beforeEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Clear the DOM after every test to prevent duplicate elements
beforeEach(() => {
  cleanup();
});