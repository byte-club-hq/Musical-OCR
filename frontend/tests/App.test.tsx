import { render } from '@testing-library/react-native';

import { App } from '../src/App';

describe('App', () => {
  it('renders the application title', async () => {
    const { getByText } = await render(<App />);

    expect(getByText('Sheet Music Scanner')).toBeTruthy();
  });
});
