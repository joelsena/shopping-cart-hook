import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const LOCAL_CART_KEY = "@RocketShoes:cart";

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStocked } = await api.get<Stock>(
        `/stock/${productId}`
      );

      const { data: APIProduct } = await api.get<Product>(
        `/products/${productId}`
      );

      const localProduct = cart.filter((item) => item.id === productId)[0];

      let alreadyExist = localProduct ? true : false;

      if (alreadyExist) {
        if (productStocked.amount - (localProduct.amount + 1) >= 0) {
          setCart((prevCart) => {
            const newCart = prevCart.map((item) => ({
              ...item,
              amount: item.id === productId ? item.amount + 1 : item.amount,
            }));

            localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(newCart));
            return newCart;
          });
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } else {
        if (productStocked.amount - 1 >= 0) {
          setCart((prevCart) => {
            const newCart = [
              ...prevCart,
              {
                ...APIProduct,
                amount: 1,
              },
            ];

            localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(newCart));
            return newCart;
          });
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      }
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.filter((product) => product.id === productId)[0];

      if (!product) {
        throw new Error("Erro na remoção do produto");
      }

      setCart((prevCart) => {
        const filteredCart = prevCart.filter(
          (product) => product.id !== productId
        );

        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(filteredCart));
        return filteredCart;
      });
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: productStocked } = await api.get<Stock>(
        `/stock/${productId}`
      );

      if (productStocked.amount - amount >= 0) {
        setCart((prevCart) => {
          const cartUpdated = prevCart.map((product) => ({
            ...product,
            amount: product.id === productId ? amount : product.amount,
          }));

          localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cartUpdated));
          return cartUpdated;
        });
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch (error) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
