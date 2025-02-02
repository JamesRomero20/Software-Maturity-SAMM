
const express = require('express');
const app = express();

app.use(express.urlencoded({extend:false}));
app.use(express.json());

const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

const bcryptjs = require('bcryptjs');

const session = require('express-session');
app.use(session({
    secret:'secret',
    resave: true,
    saveUninitialized: true
}));

const connection = require('./database/db');

app.get('/login',(req, res)=>{
    res.render('login');
})

app.get('/register',(req, res)=>{
    res.render('register');
})

app.get('/principal',(req, res)=>{
    if (req.session.loggedin) {
		res.render('principal',{
			login: true,
			name: req.session.name			
            
		});		
	} else {
		res.render('index',{
			login:false,
			name:'Debe iniciar sesión',			
		});				
	}
	res.end();
})

app.get('/cuestionario',(req, res)=>{
    const proyectoId = req.session.proyectoId;
    if (req.session.loggedin) {
        res.render('cuestionario',{
			login: true,
			name: req.session.name,
            proyectoId: proyectoId 
		});		
	} else {
		res.render('index',{
			login:false,
			name:'Debe iniciar sesión',	
		});				
	}
	res.end();
})


app.get('/resultados', async (req, res)=>{
    const proyectoId = req.session.proyectoId;
    if (!proyectoId) {
        return res.status(400).send('ID del proyecto no proporcionado');
    }
    connection.query('SELECT titulo, descripcion FROM proyecto WHERE id = ?', [proyectoId], (error, results) => {
        if (error) {
            return res.status(500).send('Error al consultar la base de datos');
        }

        if (results.length === 0) {
            return res.status(404).send('Proyecto no encontrado');
        }

        const proyecto = results[0];
        

    if (req.session.loggedin) {
            res.render('resultados', {
            login: true,
            name: req.session.name,
            nombreProyecto: proyecto.titulo,
            descripcionProyecto: proyecto.descripcion,
        });	
	} else {
		res.render('index',{
			login:false,
			name:'Debe iniciar sesión',			
		});				
	}
	res.end();
}) 
}) 


app.get('/proyecto',(req, res)=>{
    if (req.session.loggedin) {
		res.render('proyecto',{
			login: true,
			name: req.session.name,			
		});		
	} else {
		res.render('index',{
			login:false,
			name:'Debe iniciar sesión',			
		});				
	}
	res.end();
})

app.post('/proyecto', async (req, res)=>{
    const titulo = req.body.titulo;
    const descripcion = req.body.descripcion;
    connection.query('INSERT INTO proyecto SET ?', {titulo:titulo, descripcion:descripcion}, async(error, results)=>{
        if(error){
            res.render('proyecto', {
                alert: true,
                alertTitle: 'Error',
                alertMessage: '¡Datos no registrados!',
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: 'proyecto'
            });
        }else{ 
            const proyectoId = results.insertId;
            req.session.proyectoId = proyectoId; 
            
            res.render('proyecto', {
                alert: true,
                alertTitle: 'Registro existoso',
                alertMessage: '¡Proyecto guardado!',
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: 'cuestionario'
            });
            
        }
    })
})


app.post('/register', async (req, res)=>{
    const user = req.body.user;
    const name = req.body.name;
    const rol = req.body.rol;
    const pass = req.body.pass;
    let passordHaash = await bcryptjs.hash(pass, 8);
    connection.query('INSERT INTO users SET ?', {user:user, name:name, rol:rol, pass:passordHaash}, async(error, results)=>{
        if(error){
            res.render('register', {
                alert: true,
                alertTitle: 'Error',
                alertMessage: '¡Datos no registrados!',
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: 'register'
            });
        }else{
            res.render('register', {
                alert: true,
                alertTitle: 'Registro',
                alertMessage: '¡Registro existoso!',
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });
        }
    })
})

app.post('/auth', async (req, res)=>{
    const user = req.body.user;
    const pass = req.body.pass;
    let passordHaash = await bcryptjs.hash(pass, 8);
    if(user && pass){
        connection.query('SELECT * FROM users WHERE user = ?', [user], async (error, results)=>{
            if(results.lenght == 0 || !(await bcryptjs.compare(pass, results[0].pass))){
                res.render('login',{
                    alert: true,
                    alertTitle: 'Error',
                    alertMessage: '¡Usuario y/o password incorrecto!',
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                })
            }else{
                req.session.loggedin = true;             
				req.session.name = results[0].name;
                res.render('login',{
                    alert: true,
                    alertTitle: 'Conexión Exitosa',
                    alertMessage: '¡Login Correcto!',
                    alertIcon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: 'principal'
                })
            }
        })
    }else {	
		res.send('Please enter user and Password!');
		res.end();
	}
})

app.get('/', (req, res)=> {
	if (req.session.loggedin) {
		res.render('index',{
			login: true,
			name: req.session.name			
		});		
	} else {
		res.render('index',{
			login:false,
			name:'Debe iniciar sesión',			
		});				
	}
	res.end();
});

app.use(function(req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});

app.get('/logout', function (req, res) {
	req.session.destroy(() => {
	  res.redirect('/') 
	})
});

app.listen(3000, (req, res)=>{
    console.log('SERVER RUNNING IN http://localhost:3000');

})
