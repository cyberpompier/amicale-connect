import { createContext, useContext, type ReactNode } from 'react'
import { useMenuPermissions } from '@/hooks/useMenuPermissions'

interface MenuPermissionsContextType {
  isAllowed: (menuPath: string) => boolean
  userRole: string | null
  loading: boolean
}

const MenuPermissionsContext = createContext<MenuPermissionsContextType>({
  isAllowed: () => true,
  userRole: null,
  loading: false,
})

export function MenuPermissionsProvider({ children }: { children: ReactNode }) {
  const value = useMenuPermissions()
  return (
    <MenuPermissionsContext.Provider value={value}>
      {children}
    </MenuPermissionsContext.Provider>
  )
}

export function useMenuPermissionsContext() {
  return useContext(MenuPermissionsContext)
}
