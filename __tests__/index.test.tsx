import React from 'react';
jest.mock('../auth/AuthGate', () => ({ children }: any) => <div>{children}</div>);
jest.mock('../auth/HallList', () => () => <div>HallList</div>);

import { render } from '@testing-library/react';
import Home from '../pages/index';

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />);
  });
}); 