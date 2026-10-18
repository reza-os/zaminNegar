import { CoverflowCarousel } from './coverflow-carousel';
import { partnerBrands } from '../../config/partners';

export default function CoverflowDemo() {
  return <CoverflowCarousel slides={partnerBrands.map(({ id, name, logoSrc }) => ({ id, title: name, src: logoSrc }))} />;
}
