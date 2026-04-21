import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'
import type { CartItem } from './useBoutiqueCart'

export interface CommandeItem {
  id: string
  commande_id: string
  produit_id: string
  variante_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  boutique_produits?: { name: string; image_url: string | null }
  boutique_produit_variantes?: { type: string; value: string } | null
}

export interface Commande {
  id: string
  association_id: string
  user_id: string | null
  user_name: string
  user_email: string
  user_phone: string | null
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total_amount: number
  tax_amount: number
  shipping_address: string | null
  payment_method: 'stripe' | 'manual'
  payment_status: 'pending' | 'completed' | 'failed'
  stripe_payment_intent_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  boutique_commande_items?: CommandeItem[]
}

export type CommandeInput = {
  user_name: string
  user_email: string
  user_phone?: string
  shipping_address?: string
  payment_method: 'stripe' | 'manual'
  notes?: string
}

export function useBoutiqueCommandes() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [commandes, setCommandes] = useState<Commande[]>([])
  const [allCommandes, setAllCommandes] = useState<Commande[]>([]) // admin
  const [loading, setLoading] = useState(true)

  const fetchUserCommandes = useCallback(async () => {
    if (!currentAssociation || !user) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('boutique_commandes')
      .select(`
        *,
        boutique_commande_items(
          *,
          boutique_produits(name, image_url),
          boutique_produit_variantes(type, value)
        )
      `)
      .eq('association_id', currentAssociation.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setCommandes(data || [])
    setLoading(false)
  }, [currentAssociation, user])

  const fetchAllCommandes = useCallback(async () => {
    if (!currentAssociation) return

    const { data, error } = await supabase
      .from('boutique_commandes')
      .select(`
        *,
        boutique_commande_items(
          *,
          boutique_produits(name, image_url),
          boutique_produit_variantes(type, value)
        )
      `)
      .eq('association_id', currentAssociation.id)
      .order('created_at', { ascending: false })

    if (!error) setAllCommandes(data || [])
  }, [currentAssociation])

  useEffect(() => {
    fetchUserCommandes()
    fetchAllCommandes()
  }, [fetchUserCommandes, fetchAllCommandes])

  const createCommande = async (cartItems: CartItem[], input: CommandeInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const total_amount = cartItems.reduce((sum, item) => {
      const basePrice = item.boutique_produits?.base_price ?? 0
      const modifier = item.boutique_produit_variantes?.price_modifier ?? 0
      return sum + (basePrice + modifier) * item.quantity
    }, 0)

    const { data: commande, error: cErr } = await supabase
      .from('boutique_commandes')
      .insert({
        association_id: currentAssociation.id,
        user_id: user.id,
        user_name: input.user_name,
        user_email: input.user_email,
        user_phone: input.user_phone || null,
        shipping_address: input.shipping_address || null,
        payment_method: input.payment_method,
        notes: input.notes || null,
        total_amount,
        tax_amount: 0,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (cErr) throw cErr

    const items = cartItems.map((item) => {
      const basePrice = item.boutique_produits?.base_price ?? 0
      const modifier = item.boutique_produit_variantes?.price_modifier ?? 0
      const unitPrice = basePrice + modifier
      return {
        commande_id: commande.id,
        produit_id: item.produit_id,
        variante_id: item.variante_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
      }
    })

    const { error: iErr } = await supabase.from('boutique_commande_items').insert(items)
    if (iErr) throw iErr

    await fetchUserCommandes()
    return commande
  }

  const updateStatus = async (commandeId: string, status: Commande['status']) => {
    const { error } = await supabase
      .from('boutique_commandes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', commandeId)
    if (error) throw error
    await Promise.all([fetchUserCommandes(), fetchAllCommandes()])
  }

  const markAsPaid = async (commandeId: string) => {
    const { error } = await supabase
      .from('boutique_commandes')
      .update({ payment_status: 'completed', status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', commandeId)
    if (error) throw error
    await Promise.all([fetchUserCommandes(), fetchAllCommandes()])
  }

  const cancelCommande = async (commandeId: string) => {
    const { error } = await supabase
      .from('boutique_commandes')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', commandeId)
    if (error) throw error
    await Promise.all([fetchUserCommandes(), fetchAllCommandes()])
  }

  return {
    commandes,
    allCommandes,
    loading,
    refetch: () => Promise.all([fetchUserCommandes(), fetchAllCommandes()]),
    createCommande,
    updateStatus,
    markAsPaid,
    cancelCommande,
  }
}
