/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ChevronRight, Minus, Plus, X, Truck, Store } from 'lucide-react';
import { fetchProducts, fetchDeliveryOptions } from './services/products';
import { Product, CartItem, DeliveryOption, ProductWeight } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bargainPrice, setBargainPrice] = useState<string>('');
  const [isBargaining, setIsBargaining] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    
    const loadData = async () => {
      const [productsData, deliveryData] = await Promise.all([
        fetchProducts(),
        fetchDeliveryOptions()
      ]);
      setProducts(productsData);
      setDeliveryOptions(deliveryData);
      if (deliveryData.length > 0) {
        setSelectedDeliveryId(deliveryData[0].id);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const addToCart = (product: Product, selectedWeight: ProductWeight) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedWeight.weight === selectedWeight.weight);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedWeight.weight === selectedWeight.weight)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, selectedWeight, quantity: 1 }];
    });
    WebApp.HapticFeedback.impactOccurred('light');
  };

  const removeFromCart = (productId: string, weight: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId && item.selectedWeight.weight === weight);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          (item.id === productId && item.selectedWeight.weight === weight)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => !(item.id === productId && item.selectedWeight.weight === weight));
    });
    WebApp.HapticFeedback.impactOccurred('light');
  };

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const selectedDelivery = useMemo(() => 
    deliveryOptions.find(o => o.id === selectedDeliveryId) || deliveryOptions[0]
  , [deliveryOptions, selectedDeliveryId]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.selectedWeight.price * item.quantity), 0), [cart]);

  const deliveryCost = useMemo(() => {
    if (!selectedDelivery) return 0;
    if (selectedDelivery.type === 'pickup') return 0;
    if (totalItems === 0) return 0;
    return selectedDelivery.price;
  }, [selectedDelivery, totalItems]);

  const total = subtotal + deliveryCost;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const itemsText = cart.map(item => 
      `${item.name} (${item.selectedWeight.weight}) x${item.quantity} - ${item.selectedWeight.price * item.quantity}р`
    ).join('\n');

    const deliveryText = selectedDelivery ? `${selectedDelivery.name} (${deliveryCost}р)` : 'Не выбрано';
    
    let message = `Я хочу купить эти позиции на сумму ${total}р и с доставкой (${deliveryText}):\n\n${itemsText}\n\nИтого: ${total}р`;
    
    if (bargainPrice && !isNaN(Number(bargainPrice))) {
      const discount = total - Number(bargainPrice);
      if (discount > 0) {
        message += `\n\nПредложенная цена: ${bargainPrice}р\nПолучится сделать скидку в размере ${discount}р?`;
      }
    }
    
    const encodedMessage = encodeURIComponent(message);
    
    // ВАЖНО: ownerId должен быть вашим ЛИЧНЫМ юзернеймом (например, 'my_name'), а не юзернеймом бота.
    // Если это бот, параметр ?text= работать не будет.
    const ownerId = 'bd77797'; 
    
    // Используем t.me/share/url для максимальной совместимости на мобильных устройствах.
    // Это откроет окно выбора чата с уже вставленным текстом заказа.
    const url = `https://t.me/share/url?url=&text=${encodedMessage}`;
    
    WebApp.openTelegramLink(url);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-white/20">
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">ODA EDA</h1>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      {/* Product List */}
      <main className="px-4 py-6 grid grid-cols-2 gap-3 pb-32">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 bg-[#1e293b] rounded-t-[32px] z-50 max-h-[90vh] overflow-hidden flex flex-col border-t border-white/10 shadow-2xl"
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <h2 className="text-xl font-bold">Корзина</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Ваша корзина пуста</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 text-emerald-400 font-bold text-sm"
                    >
                      Вернуться к покупкам
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {cart.map((item, idx) => (
                        <div key={`${item.id}-${item.selectedWeight.weight}`} className="flex items-center gap-4">
                          <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-white/5" referrerPolicy="no-referrer" />
                          <div className="flex-1">
                            <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                            <p className="text-xs text-white/40 mt-1">{item.selectedWeight.weight} • {item.selectedWeight.price}р</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white/5 rounded-full p-1">
                            <button 
                              onClick={() => removeFromCart(item.id, item.selectedWeight.weight)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => addToCart(item, item.selectedWeight)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">Доставка</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {deliveryOptions.map((option) => (
                          <button 
                            key={option.id}
                            onClick={() => setSelectedDeliveryId(option.id)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                              selectedDeliveryId === option.id ? "bg-emerald-500/20 border-emerald-500/50" : "bg-white/5 border-white/10 opacity-60"
                            )}
                          >
                            {option.type === 'pickup' ? <Store size={20} /> : <Truck size={20} />}
                            <span className="text-xs font-medium">{option.name}</span>
                            <span className="text-[10px] opacity-60">{option.price}р</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bargain Section */}
                    <div className="pt-4">
                      {!isBargaining ? (
                        <button 
                          onClick={() => setIsBargaining(true)}
                          className="text-[10px] text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest font-bold"
                        >
                          Торговаться
                        </button>
                      ) : (
                        <div className="bg-white/5 p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white/60">Ваша цена</span>
                            <button onClick={() => setIsBargaining(false)} className="text-white/40"><X size={14} /></button>
                          </div>
                          <input 
                            type="number" 
                            value={bargainPrice}
                            onChange={(e) => setBargainPrice(e.target.value)}
                            placeholder="Введите сумму"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500/50"
                          />
                          <p className="text-[10px] text-white/40 italic">Мы рассмотрим ваше предложение при обработке заказа</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-white/5 border-t border-white/5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/60">
                      <span>Сумма</span>
                      <span>{subtotal}р</span>
                    </div>
                    <div className="flex justify-between text-sm text-white/60">
                      <span>Доставка</span>
                      <span>{deliveryCost}р</span>
                    </div>
                    {bargainPrice && !isNaN(Number(bargainPrice)) && Number(bargainPrice) < total && (
                      <div className="flex justify-between text-sm text-emerald-400 font-medium">
                        <span>Предложенная цена</span>
                        <span>{bargainPrice}р</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/5">
                      <span>Итого</span>
                      <span>{total}р</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    Оформить заказ
                    <ChevronRight size={20} />
                  </button>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="w-full text-white/40 text-xs font-bold uppercase tracking-widest py-2"
                  >
                    Назад к покупкам
                  </button>

                  {/* Recommendations */}
                  <div className="pt-4 space-y-3">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/20 text-center">Рекомендуем добавить</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                      {products
                        .filter(p => !cart.some(c => c.id === p.id))
                        .slice(0, 6)
                        .map(product => (
                          <div key={product.id} className="bg-white/5 rounded-xl p-2 flex flex-col gap-1 min-w-[100px] max-w-[100px]">
                            <img src={product.image} alt={product.name} className="aspect-square object-cover rounded-lg" referrerPolicy="no-referrer" />
                            <h4 className="text-[9px] font-bold line-clamp-1">{product.name}</h4>
                            <button 
                              onClick={() => addToCart(product, product.weights[0])}
                              className="bg-white/10 hover:bg-white/20 text-white py-1 rounded-md text-[8px] font-bold transition-colors"
                            >
                              +{product.weights[0].price}р
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Bar (Quick Summary) */}
      {totalItems > 0 && !isCartOpen && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 inset-x-4 z-40"
        >
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl flex justify-between items-center shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <ShoppingCart size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs text-white/60 font-medium">{totalItems} поз.</p>
                <p className="font-bold">{total}р</p>
              </div>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Корзина
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}

const ProductCard: React.FC<{ product: Product; onAdd: (p: Product, w: ProductWeight) => void }> = ({ product, onAdd }) => {
  const [selectedWeightIdx, setSelectedWeightIdx] = useState(0);
  const selectedWeight = product.weights[selectedWeightIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden group">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60" />
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <div className="space-y-1">
          <h3 className="text-sm font-bold leading-tight line-clamp-2 h-10">{product.name}</h3>
        </div>

        {/* Weight Switcher */}
        {product.weights.length > 1 && (
          <div className="flex flex-wrap gap-1 p-0.5 bg-white/5 rounded-lg self-start">
            {product.weights.map((w, idx) => (
              <button
                key={w.weight}
                onClick={() => setSelectedWeightIdx(idx)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                  selectedWeightIdx === idx ? "bg-white text-[#0f172a] shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                {w.weight}
              </button>
            ))}
          </div>
        )}

        <div className="pt-1 mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Цена</span>
            <span className="text-lg font-black text-emerald-400">{selectedWeight.price}р</span>
          </div>
          <button 
            onClick={() => onAdd(product, selectedWeight)}
            className="bg-white text-[#0f172a] p-2 rounded-xl hover:bg-emerald-400 transition-all active:scale-90 shadow-xl"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
