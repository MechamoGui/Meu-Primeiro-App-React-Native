import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tasks_data';
const API_URL = 'https://jsonplaceholder.typicode.com/todos';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState('all'); // all, completed, pending

  // Função para carregar tarefas da API
  const fetchTasks = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      
      // Limita a 20 tarefas e adiciona timestamp
      const limitedTasks = data.slice(0, 20).map(task => ({
        ...task,
        createdAt: new Date().toISOString(),
      }));
      
      setTasks(limitedTasks);
      setLastUpdated(new Date().toLocaleString());
      
      // Salva no AsyncStorage
      await saveTasksToStorage(limitedTasks);
      
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas da API');
    }
  };

  // Função para salvar tarefas no AsyncStorage
  const saveTasksToStorage = async (tasksData) => {
    try {
      const dataToStore = {
        tasks: tasksData,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Erro ao salvar no storage:', error);
    }
  };

  // Função para carregar tarefas do AsyncStorage
  const loadTasksFromStorage = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const { tasks: storedTasks, timestamp } = JSON.parse(storedData);
        setTasks(storedTasks);
        setLastUpdated(new Date(timestamp).toLocaleString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar do storage:', error);
      return false;
    }
  };

  // Função para adicionar nova tarefa
  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Erro', 'Digite um título para a tarefa');
      return;
    }

    const newTask = {
      id: Math.max(...tasks.map(t => t.id), 0) + 1,
      title: newTaskTitle.trim(),
      completed: false,
      userId: 1,
      createdAt: new Date().toISOString(),
      isLocal: true, // Marca como tarefa criada localmente
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    await saveTasksToStorage(updatedTasks);
    
    setNewTaskTitle('');
    setModalVisible(false);
    Alert.alert('Sucesso', 'Tarefa adicionada com sucesso!');
  };

  // Função para alternar status da tarefa
  const toggleTaskStatus = async (taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    setTasks(updatedTasks);
    await saveTasksToStorage(updatedTasks);
  };

  // Função para remover tarefa
  const removeTask = async (taskId) => {
    Alert.alert(
      'Confirmar',
      'Deseja realmente remover esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            setTasks(updatedTasks);
            await saveTasksToStorage(updatedTasks);
          },
        },
      ]
    );
  };

  // Função para limpar dados armazenados
  const clearStorage = async () => {
    Alert.alert(
      'Confirmar',
      'Isso removerá todas as tarefas salvas localmente',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setTasks([]);
              setLastUpdated(null);
              Alert.alert('Sucesso', 'Dados locais removidos');
            } catch (error) {
              console.error('Erro ao limpar storage:', error);
              Alert.alert('Erro', 'Não foi possível limpar os dados');
            }
          },
        },
      ]
    );
  };

  // Função para atualizar dados
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // Filtra tarefas baseado no filtro selecionado
  const getFilteredTasks = () => {
    switch (filter) {
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'pending':
        return tasks.filter(task => !task.completed);
      default:
        return tasks;
    }
  };

  // Carrega dados ao iniciar o app
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      // Tenta carregar dados salvos primeiro
      const hasStoredData = await loadTasksFromStorage();
      
      if (!hasStoredData) {
        // Se não há dados salvos, busca da API
        await fetchTasks();
      }
      
      setLoading(false);
    };

    initializeApp();
  }, []);

  // Renderiza cada tarefa
  const renderTask = ({ item }) => (
    <TouchableOpacity 
      style={[styles.taskContainer, item.completed && styles.completedTask]}
      onPress={() => toggleTaskStatus(item.id)}
    >
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={[styles.checkbox, item.completed && styles.checkedBox]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
            {item.title}
          </Text>
          {item.isLocal && <View style={styles.localBadge}>
            <Text style={styles.localBadgeText}>LOCAL</Text>
          </View>}
        </View>
        <View style={styles.taskFooter}>
          <Text style={styles.taskId}>ID: #{item.id}</Text>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => removeTask(item.id)}
          >
            <Text style={styles.removeButtonText}>Remover</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Renderiza cabeçalho da lista
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Minhas Tarefas</Text>
      {lastUpdated && (
        <Text style={styles.lastUpdated}>
          Última sincronização: {lastUpdated}
        </Text>
      )}
      
      {/* Filtros */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            Todas ({tasks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
            Pendentes ({tasks.filter(t => !t.completed).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
            Concluídas ({tasks.filter(t => t.completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>+ Nova Tarefa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={fetchTasks}>
          <Text style={styles.buttonText}>Sincronizar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearStorage}
        >
          <Text style={styles.buttonText}>Limpar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando tarefas...</Text>
      </View>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTask}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'Nenhuma tarefa encontrada' :
               filter === 'completed' ? 'Nenhuma tarefa concluída' :
               'Nenhuma tarefa pendente'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {/* Modal para adicionar nova tarefa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Tarefa</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Digite o título da tarefa..."
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              multiline
              maxLength={100}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewTaskTitle('');
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.addButton]}
                onPress={addTask}
              >
                <Text style={styles.buttonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  activeFilter: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  taskContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  completedTask: {
    backgroundColor: '#f8f9fa',
    opacity: 0.8,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  localBadge: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  localBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskId: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
});