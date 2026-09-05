import Header from '@/components/Header';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import { getMenu } from '@/lib/menu';

export const revalidate = 60;

export default async function Home() {
  const dishes = await getMenu();

  return (
    <>
      <Header />
      <Hero dishes={dishes} />
      <MenuSection dishes={dishes} />
      <Footer />
      <CartDrawer />
    </>
  );
}
