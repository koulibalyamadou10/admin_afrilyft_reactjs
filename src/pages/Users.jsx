import { useState, useEffect } from 'react'
import { Eye, Edit, Trash2, Plus, UserCheck, UserX, Search, Filter, Shield, ShieldCheck } from 'lucide-react'
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
  const [modalType, setModalType] = useState('view') // 'view', 'edit', 'delete', 'create'
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'customer',
    is_active: true,
    is_verified: false,
    avatar_url: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

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
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        } : user
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const handleVerificationToggle = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          is_verified: !currentStatus,
          updated_at: new Date().toISOString()
        } : user
      ))
    } catch (error) {
      console.error('Error updating user verification:', error)
    }
  }

  const handleDelete = async (userId) => {
    try {
      // D'abord supprimer le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Ensuite supprimer l'utilisateur auth (si possible)
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (authError) {
        console.warn('Could not delete auth user:', authError)
      }
      
      setUsers(users.filter(user => user.id !== userId))
      setShowModal(false)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.full_name.trim()) {
      errors.full_name = 'Le nom complet est requis'
    }
    
    if (!formData.email.trim()) {
      errors.email = 'L\'email est requis'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Format d\'email invalide'
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Le téléphone est requis'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSubmitting(true)
    
    try {
      if (modalType === 'create') {
        // Créer d'abord l'utilisateur auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: 'TempPassword123!', // Mot de passe temporaire
          email_confirm: true,
          user_metadata: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role
          }
        })

        if (authError) throw authError

        // Ensuite créer le profil
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            is_active: formData.is_active,
            is_verified: formData.is_verified,
            avatar_url: formData.avatar_url || null
          }])
          .select()

        if (profileError) throw profileError

        setUsers([profileData[0], ...users])
      } else if (modalType === 'edit') {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            is_active: formData.is_active,
            is_verified: formData.is_verified,
            avatar_url: formData.avatar_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id)
          .select()

        if (error) throw error

        setUsers(users.map(user => 
          user.id === selectedUser.id ? data[0] : user
        ))
      }
      
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving user:', error)
      setFormErrors({ submit: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'customer',
      is_active: true,
      is_verified: false,
      avatar_url: ''
    })
    setFormErrors({})
  }

  const openCreateModal = () => {
    resetForm()
    setModalType('create')
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      is_active: user.is_active,
      is_verified: user.is_verified,
      avatar_url: user.avatar_url || ''
    })
    setModalType('edit')
    setShowModal(true)
  }

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const columns = [
    {
      key: 'user_info',
      title: 'Utilisateur',
      render: (_, row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            {row.avatar_url ? (
              <img 
                className="h-10 w-10 rounded-full object-cover" 
                src={row.avatar_url} 
                alt={row.full_name}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div className={`h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center ${row.avatar_url ? 'hidden' : ''}`}>
              <span className="text-sm font-medium text-primary-600">
                {row.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.full_name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      title: 'Téléphone',
      render: (value) => (
        <span className="text-sm text-gray-900">{value}</span>
      )
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
      key: 'status',
      title: 'Statut',
      render: (_, row) => (
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.is_active 
              ? 'bg-success-100 text-success-800' 
              : 'bg-error-100 text-error-800'
          }`}>
            {row.is_active ? 'Actif' : 'Inactif'}
          </span>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            row.is_verified 
              ? 'bg-success-100 text-success-800' 
              : 'bg-warning-100 text-warning-800'
          }`}>
            {row.is_verified ? 'Vérifié' : 'Non vérifié'}
          </span>
        </div>
      )
    },
    {
      key: 'created_at',
      title: 'Date d\'inscription',
      render: (value) => (
        <div className="text-sm text-gray-900">
          {format(new Date(value), 'dd MMM yyyy', { locale: fr })}
        </div>
      )
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
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="text-blue-600 hover:text-blue-900"
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleStatusToggle(row.id, row.is_active)}
            className={`${row.is_active ? 'text-error-600 hover:text-error-900' : 'text-success-600 hover:text-success-900'}`}
            title={row.is_active ? 'Désactiver' : 'Activer'}
          >
            {row.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handleVerificationToggle(row.id, row.is_verified)}
            className={`${row.is_verified ? 'text-warning-600 hover:text-warning-900' : 'text-success-600 hover:text-success-900'}`}
            title={row.is_verified ? 'Retirer la vérification' : 'Vérifier'}
          >
            {row.is_verified ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setSelectedUser(row)
              setModalType('delete')
              setShowModal(true)
            }}
            className="text-error-600 hover:text-error-900"
            title="Supprimer"
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
              Gérez tous les utilisateurs de votre plateforme AfriLyft
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold text-sm">{users.length}</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">Utilisateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {users.filter(u => u.role === 'driver').length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Chauffeurs</p>
              <p className="text-lg font-semibold text-gray-900">Actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">
                  {users.filter(u => u.is_verified).length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Vérifiés</p>
              <p className="text-lg font-semibold text-gray-900">Comptes</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold text-sm">
                  {users.filter(u => !u.is_active).length}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactifs</p>
              <p className="text-lg font-semibold text-gray-900">Comptes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="all">Tous les rôles</option>
              <option value="customer">Clients</option>
              <option value="driver">Chauffeurs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} utilisateur(s) trouvé(s)
            </div>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredUsers}
        loading={loading}
      />

      {/* Modal de visualisation */}
      <Modal
        isOpen={showModal && modalType === 'view'}
        onClose={() => setShowModal(false)}
        title="Détails de l'utilisateur"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 flex-shrink-0">
                {selectedUser.avatar_url ? (
                  <img 
                    className="h-16 w-16 rounded-full object-cover" 
                    src={selectedUser.avatar_url} 
                    alt={selectedUser.full_name}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={`h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center ${selectedUser.avatar_url ? 'hidden' : ''}`}>
                  <span className="text-xl font-medium text-primary-600">
                    {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedUser.full_name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
                <div className="flex space-x-2 mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedUser.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    {selectedUser.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedUser.is_verified 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-warning-100 text-warning-800'
                  }`}>
                    {selectedUser.is_verified ? 'Vérifié' : 'Non vérifié'}
                  </span>
                </div>
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
                <label className="block text-sm font-medium text-gray-700">Date d'inscription</label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedUser.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Dernière mise à jour</label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedUser.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => openEditModal(selectedUser)}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Modifier
              </button>
              <button
                onClick={() => handleVerificationToggle(selectedUser.id, selectedUser.is_verified)}
                className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                  selectedUser.is_verified
                    ? 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500'
                    : 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500'
                }`}
              >
                {selectedUser.is_verified ? 'Retirer la vérification' : 'Vérifier'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de création/modification */}
      <Modal
        isOpen={showModal && (modalType === 'create' || modalType === 'edit')}
        onClose={() => setShowModal(false)}
        title={modalType === 'create' ? 'Créer un utilisateur' : 'Modifier l\'utilisateur'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                  formErrors.full_name ? 'border-red-300' : ''
                }`}
                placeholder="Nom complet"
              />
              {formErrors.full_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.full_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                  formErrors.email ? 'border-red-300' : ''
                }`}
                placeholder="email@exemple.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Téléphone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                  formErrors.phone ? 'border-red-300' : ''
                }`}
                placeholder="+224 XXX XXX XXX"
              />
              {formErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rôle
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="customer">Client</option>
                <option value="driver">Chauffeur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              URL de l'avatar (optionnel)
            </label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="https://exemple.com/avatar.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Compte actif
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_verified"
                checked={formData.is_verified}
                onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_verified" className="ml-2 block text-sm text-gray-900">
                Compte vérifié
              </label>
            </div>
          </div>

          {formErrors.submit && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              {formErrors.submit}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enregistrement...' : (modalType === 'create' ? 'Créer' : 'Modifier')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showModal && modalType === 'delete'}
        onClose={() => setShowModal(false)}
        title="Supprimer l'utilisateur"
      >
        {selectedUser && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser.full_name}</strong> ? 
              Cette action est irréversible et supprimera également toutes les données associées (courses, paiements, etc.).
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Attention
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Cette action supprimera définitivement :</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>Le profil utilisateur</li>
                      <li>L'historique des courses</li>
                      <li>Les méthodes de paiement</li>
                      <li>Les évaluations et commentaires</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
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
                Supprimer définitivement
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}