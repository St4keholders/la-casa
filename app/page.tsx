import Header from '@/components/Header';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <MenuSection />
      <Footer />
      <CartDrawer />
    </>
  );
}
