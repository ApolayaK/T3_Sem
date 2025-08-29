require('dotenv').config();
const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Puerto
const port = process.env.PORT || 3000;

// Función para manejar errores de BD
const handDbError = (res, error) => {
  console.error('Error de acceso BD:', error);
  res.status(500).json({ error: 'Error interno en el servidor' });
};

// ---------------- API JSON ----------------

// GET (listar en JSON)
app.get('/api/vehiculos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehiculos');
    res.status(200).json(rows);
  } catch (error) {
    handDbError(res, error);
  }
});

// POST (insertar)
app.post('/api/vehiculos', async (req, res) => {
  const { marca, modelo, color, precio, placa } = req.body;

  if (!marca || !modelo || !color || !precio || !placa) {
    return res.status(400).json({ error: 'Todos los campos son necesarios' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO vehiculos (marca, modelo, color, precio, placa) VALUES (?,?,?,?,?)',
      [marca, modelo, color, precio, placa]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La placa ya existe' });
    }
    handDbError(res, error);
  }
});

// PUT (actualizar)
app.put('/api/vehiculos/:id', async (req, res) => {
  const { id } = req.params;
  const { marca, modelo, color, precio, placa } = req.body;

  if (!marca || !modelo || !color || !precio || !placa) {
    return res.status(400).json({ error: 'Todos los campos son necesarios' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE vehiculos SET marca=?, modelo=?, color=?, precio=?, placa=? WHERE id=?',
      [marca, modelo, color, precio, placa, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vehículo no existe' });
    }

    res.status(200).json({ success: true, message: 'Vehículo actualizado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La placa ya existe' });
    }
    handDbError(res, error);
  }
});

// DELETE (eliminar)
app.delete('/api/vehiculos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM vehiculos WHERE id=?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vehículo no existe' });
    }

    res.status(200).json({ success: true, message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    handDbError(res, error);
  }
});

// ---------------- VISTAS (EJS) ----------------

// Redirigir raíz al listado
app.get('/', (req, res) => {
  res.redirect('/vehiculos');
});

// Listado en HTML
app.get('/vehiculos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vehiculos');
    res.render('vehiculos', { vehiculos: rows });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------------- INICIAR SERVIDOR ----------------
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
