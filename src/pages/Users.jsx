import { useState, useEffect } from 'react'
import { Eye, Edit, Trash2, Plus, UserCheck, UserX } from 'lucide-react'
import Table from '../components/UI/Table'
import Modal from '../components/UI/Modal'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view') // 'view', 'edit', 'delete'

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const handleDelete = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.filter(user => user.id !== userId))
      setShowModal(false)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const columns = [
    {
      key: 'full_name',
      title: 'Nom complet',
      render: (value, row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600">
                {value?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      title: 'Téléphone',
    },
    {
      key: 'role',
      title: 'Rôle',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'driver' 
            ? 'bg-primary-100 text-primary-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value === 'driver' ? 'Chauffeur' : 'Client'}
        </span>
      )
    },
    {
      key: 'is_active',
      title: 'Statut',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value 
            ? 'bg-success-100 text-success-800' 
            : 'bg-error-100 text-error-800'
        }`}>
          {value ? 'Actif' : 'Inactif'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Date d\'inscription',
      render: (value) => format(new Date(value), 'dd MMM yyyy', { locale: fr })
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedUser(row)
              setModalType('view')
              setShowModal(true)
            }}
            className="text-primary-600 hover:text-primary-900"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleStatusToggle(row.id, row.is_active)}
            className={`${row.is_active ? 'text-error-600 hover:text-error-900' : 'text-success-600 hover:text-success-900'}`}
          >
            {row.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setSelectedUser(row)
              setModalType('delete')
              setShowModal(true)
            }}
            className="text-error-600 hover:text-error-900"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez tous les utilisateurs de votre plateforme
            </p>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={users}
        loading={loading}
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showModal && modalType === 'view'}
        onClose={() => setShowModal(false)}
        title="Détails de l'utilisateur"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xl font-medium text-primary-600">
                  {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedUser.full_name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedUser.role === 'driver' ? 'Chauffeur' : 'Client'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Statut</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedUser.is_active ? 'Actif' : 'Inactif'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vérifié</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedUser.is_verified ? 'Oui' : 'Non'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date d'inscription</label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedUser.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showModal && modalType === 'delete'}
        onClose={() => setShowModal(false)}
        title="Supprimer l'utilisateur"
      >
        {selectedUser && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser.full_name}</strong> ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(selectedUser.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-error-600 border border-transparent rounded-md hover:bg-error-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}