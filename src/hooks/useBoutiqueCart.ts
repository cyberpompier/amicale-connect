import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import type { BoutiqueProduit, BoutiqueVariante } from './useBoutiqueProduits'

export interface CartItem {
  id: string
  association_id: string
  user_id: string
  produit_id: string
  variante_id: string | null
  quantity: number
  added_at: string
  expires_at: string
  boutique_produits?: BoutiqueProduit
  boutique_produit_variantes?: BoutiqueVariante | null
}

export interface CartTotal {
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

const TAX_RATE = 0 // TVA: adapter selon les besoins

export function useBoutiqueCart() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCart = useCallback(async () => {
    if (!currentAssociation || !user) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('boutique_panier')
      .select(`
        *,
        boutique_produits(*, boutique_vendors(*), boutique_categories(*)),
        boutique_produit_variantes(*)
      `)
      .eq('user_id', user.id)
      .eq('association_id', currentAssociation.id)
      .gt('expires_at', new Date().toISOString())

    if (!error) setCartItems(data || [])
    setLoading(false)
  }, [currentAssociation, user])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addToCart = async (produitId: string, varianteId: string | null, quantity: number) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    // Upsert : si déjà dans le panier, met à jour la quantité
    const existing = cartItems.find(
      (c) => c.produit_id === produitId && c.variante_id === varianteId
    )

    if (existing) {
      const { error } = await supabase
        .from('boutique_panier')
        .update({ quantity: existing.quantity + quantity, expires_at: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString() })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('boutique_panier')
        .insert({
          association_id: currentAssociation.id,
          user_id: user.id,
          produit_id: produitId,
          variante_id: varianteId,
          quantity,
          expires_at: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        })
      if (error) throw error
    }

    await fetchCart()
  }

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(cartItemId)
    const { error } = await supabase
      .from('boutique_panier')
      .update({ quantity })
      .eq('id', cartItemId)
    if (error) throw error
    await fetchCart()
  }

  const removeFromCart = async (cartItemId: string) => {
    const { error } = await supabase.from('boutique_panier').delete().eq('id', cartItemId)
    if (error) throw error
    setCartItems((prev) => prev.filter((c) => c.id !== cartItemId))
  }

  const clearCart = async () => {
    if (!user) return
    const { error } = await supabase.from('boutique_panier').delete().eq('user_id', user.id)
    if (error) throw error
    setCartItems([])
  }

  const getTotal = (): CartTotal => {
    const subtotal = cartItems.reduce((sum, item) => {
      const basePrice = item.boutique_produits?.base_price ?? 0
      const modifier = item.boutique_produit_variantes?.price_modifier ?? 0
      return sum + (basePrice + modifier) * item.quantity
    }, 0)
    const tax = subtotal * TAX_RATE
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      itemCount: cartItems.reduce((sum, c) => sum + c.quantity, 0),
    }
  }

  return {
    cartItems,
    loading,
    refetch: fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotal,
    itemCount: cartItems.reduce((sum, c) => sum + c.quantity, 0),
  }
}
