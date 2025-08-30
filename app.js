require('dotenv').config();
const express = require('express');
const pool = require('./db');
const path = require('path');

const app = express();

app.use(express.json()); // Para API JSON
app.use(express.urlencoded({ extended: true })); 

// Configuración de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Puerto
const port = process.env.PORT || 3000;

// Manejo de errores DB
const handDbError = (res, error) => {
  console.error('Error de acceso BD:', error);
  res.status(500).json({ error: 'Error interno en el servidor'});
};

/* ======================
   RUTAS DEL API (JSON)
   ====================== */

// GET (listar en JSON)
app.get('/api/vehiculos', async (req, res) =>{
  try{
    const [rows] = await pool.query('SELECT * FROM vehiculos');
    res.status(200).json(rows);
  }catch(error){
    handDbError(res, error);
  }
});

// POST (insertar)
app.post('/api/vehiculos', async (req, res) =>{
  const {marca, modelo, color, precio, placa} = req.body;
  if (!marca || !modelo || !color || !precio || !placa) {
    return res.status(400).json({ error: 'Todos los campos son necesarios'});
  }
  try{
    const [result] = await pool.query(
      'INSERT INTO vehiculos (marca, modelo, color, precio, placa) VALUES(?,?,?,?,?)',
      [marca, modelo, color, precio, placa]
    );
    res.status(200).json({ id: result.insertId });
  }catch(error){
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La placa ya existe' });
    }
    handDbError(res, error);
  }
});

// PUT (actualizar)
app.put('/api/vehiculos/:id', async (req, res) =>{
  const {id} = req.params;
  const {marca, modelo, color, precio, placa} = req.body;
  if (!marca || !modelo || !color || !precio || !placa) {
    return res.status(400).json({ error: 'Todos los campos son necesarios'});
  }
  try{
    const [result] = await pool.query(
      'UPDATE vehiculos SET marca=?, modelo=?, color=?, precio=?, placa=? WHERE id=?',
      [marca, modelo, color, precio, placa, id]
    );
    if(result.affectedRows === 0){
      return res.status(404).json({success: false, message: 'Vehículo no existe'});
    }
    res.status(200).json({success: true, message: 'Vehículo actualizado correctamente'});
  }catch(error){
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La placa ya existe' });
    }
    handDbError(res, error);
  }
});

// DELETE (eliminar)
app.delete('/api/vehiculos/:id', async (req, res) =>{
  const {id} = req.params;
  try{
    const [result] = await pool.query('DELETE FROM vehiculos WHERE id=?', [id]);
    if(result.affectedRows === 0){
      return res.status(404).json({success: false, message: 'Vehículo no existe'});
    }
    res.status(200).json({success: true, message: 'Vehículo eliminado correctamente'});
  }catch(error){
    handDbError(res, error);
  }
});

/* ======================
   RUTAS DE VISTAS (EJS)
   ====================== */

// Listar vehículos
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehiculos');
    res.render('vehiculos', { vehiculos: rows });
  } catch (error) {
    res.render('error', { error: 'Error al cargar vehículos' });
  }
});

// Mostrar formulario para crear
app.get('/vehiculos/crear', (req, res) => {
  res.render('crear');
});

// Guardar nuevo vehículo
app.post('/vehiculos/nuevo', async (req, res) => {
  const { marca, modelo, color, precio, placa } = req.body;
  if (!marca || !modelo || !color || !precio || !placa) {
    return res.render('error', { error: 'Todos los campos son necesarios' });
  }

  try {
    await pool.query(
      'INSERT INTO vehiculos (marca, modelo, color, precio, placa) VALUES (?, ?, ?, ?, ?)',
      [marca, modelo, color, precio, placa]
    );
    res.redirect('/');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.render('error', { error: 'La placa ya existe' });
    }
    res.render('error', { error: 'Error al crear vehículo' });
  }
});

// Mostrar formulario para editar
app.get('/vehiculos/editar/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehiculos WHERE id=?', [req.params.id]);
    if (rows.length === 0) {
      return res.render('error', { error: 'Vehículo no encontrado' });
    }
    res.render('editar', { vehiculo: rows[0] });
  } catch (error) {
    res.render('error', { error: 'Error al cargar datos' });
  }
});

// Procesar actualización
app.post('/vehiculos/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { marca, modelo, color, precio, placa } = req.body;
  if (!marca || !modelo || !color || !precio || !placa) {
    return res.render('error', { error: 'Todos los campos son necesarios' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE vehiculos SET marca=?, modelo=?, color=?, precio=?, placa=? WHERE id=?',
      [marca, modelo, color, precio, placa, id]
    );
    if (result.affectedRows === 0) {
      return res.render('error', { error: 'Vehículo no encontrado' });
    }
    res.redirect('/');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.render('error', { error: 'La placa ya existe' });
    }
    res.render('error', { error: 'Error al actualizar vehículo' });
  }
});

// Mostrar formulario para eliminar
app.get('/vehiculos/eliminar/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehiculos WHERE id=?', [req.params.id]);
    if (rows.length === 0) {
      return res.render('error', { error: 'Vehículo no encontrado' });
    }
    res.render('eliminar', { vehiculo: rows[0] });
  } catch (error) {
    res.render('error', { error: 'Error al cargar datos' });
  }
});

// Procesar eliminación
app.post('/vehiculos/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM vehiculos WHERE id=?', [id]);
    if (result.affectedRows === 0) {
      return res.render('error', { error: 'Vehículo no encontrado' });
    }
    res.redirect('/');
  } catch (error) {
    res.render('error', { error: 'Error al eliminar vehículo' });
  }
});

// Servidor
app.listen(port,() =>{
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
