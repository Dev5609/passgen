import PassGenStudio from '@/components/pass-gen-studio';
import { AppProvider } from '@/context/app-context';

export default function Home() {
  return (
    <AppProvider>
      <PassGenStudio />
    </AppProvider>
  );
}
