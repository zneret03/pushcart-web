import { ProductsTable} from "./components/ProductsTable"
import { Container } from '@/components/custom/Container';
import { ProductsDialog } from "./components/dialogs/ProductDialog";

export default function ProductsPage() {
  return <Container title="Products" description="All added products can be seen here">
    <ProductsTable {...{products: [], totalPages: 0, currentPage: 0, count: 0}}/>
    <ProductsDialog />
  </Container>
}
