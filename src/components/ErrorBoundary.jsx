import { Component } from 'react';
import DataRescueScreen from './DataRescueScreen';

/**
 * Çizim hatasında beyaz ekran yerine kurtarma ekranı. Olmadan, bozuk tek
 * bir kayıt öğrenciyi verisine erişemeden uygulamanın dışında bırakırdı.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return <DataRescueScreen reason="crash" detail={String(this.state.error?.message || this.state.error)} />;
    }
    return this.props.children;
  }
}
