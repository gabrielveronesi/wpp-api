const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const cors = require('cors'); // Importe a biblioteca cors

function delay(t, v) {
  return new Promise(function (resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

//#region limpar

// Configurar a política de CORS para permitir acesso de qualquer origem (*)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ]
  }
});

client.initialize();

io.on('connection', function (socket) {
  socket.emit('message', '© BOT-ZDG - Iniciado');
  socket.emit('qr', './icon.svg');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('qr', './check.svg')
    console.log('© BOT-ZDG Dispositivo pronto');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', '© BOT-ZDG Autenticado!');
    socket.emit('message', '© BOT-ZDG Autenticado!');
    console.log('© BOT-ZDG Autenticado');
  });

  client.on('auth_failure', function () {
    socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
    console.error('© BOT-ZDG Falha na autenticação');
  });

  client.on('change_state', state => {
    console.log('© BOT-ZDG Status de conexão: ', state);
  });

  client.on('disconnected', (reason) => {
    socket.emit('message', '© BOT-ZDG Cliente desconectado!');
    console.log('© BOT-ZDG Cliente desconectado', reason);
    client.initialize();
  });
});

// Send message
app.post('/zdg-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Mensagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Mensagem não enviada',
        response: err.text
      });
    });
  }
});

// Send media
app.post('/zdg-media', [
  body('number').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype = 'image/png';
  // const attachment = await axios.get(fileUrl, {
  //   responseType: 'arraybuffer'
  // }).then(response => {
  //   mimetype = response.headers['content-type'];
  //   return response.data.toString('base64');
  // });
  // attachment no lugar do fileUrl
  const media = new MessageMedia(mimetype, fileUrl, 'Media');

  if (numberDDI !== "55") {
    const numberZDG = number + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
      res.status(200).json({
        status: true,
        message: 'BOT-ZDG Imagem enviada',
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'BOT-ZDG Imagem não enviada',
        response: err.text
      });
    });
  }
});
//#endregion limpar


//Mensagem para usuarios que vão entrar no grupo
client.on('group_join', (notification) => {

  console.log('notificacao', notification);
  notification.reply(`🏠 Olá, *seja bem vindo!* 🏠

Grupo destinado a avisos e discussões de melhorias do Residencial Allure.
  
Digite *!regras* e fique por dentro das premissas desse grupo.`)
});


//Mensagem no console quando o projeto terminar de rodar e estiver pronto
server.listen(port, function () {
  console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});


// ..:: Envio automatico, através de comandos ::..
client.on('message', async msg => {

  //Váriaveis globais
  var nomeContato = msg._data.notifyName;
  var chat = await msg.getChat();

  if (msg.type.toLowerCase() == "e2e_notification") return null;

  if (msg.body == "") return null;

  if (msg.body === '!ping') {
    msg.reply("pong")
  }

  if (msg.body === '!img') {
    msg.reply("*CAMBUHY A MELHOR EMPRESA PARA SE TRABALHAR* ⏱️");
    const foto = MessageMedia.fromFilePath('./foto.jpeg');
    client.sendMessage(msg.from, foto)
    delay(3000).then(async function () {
      try {
        const media = MessageMedia.fromFilePath('./comunidade.ogg');
        client.sendMessage(msg.from, media, { sendAudioAsVoice: true })
        //msg.reply(media, {sendAudioAsVoice: true});
      } catch (e) {
        console.log('audio off')
      }
    });
  }

  if (msg.body === '!regras') {

    if (chat.isGroup) {
      msg.reply(`Olá *${nomeContato}*

Quando se vive em condomínio, é essencial aplicarmos a política da boa vizinhança. Para isso, algumas vezes se faz necessário ceder e *sempre* respeitar nossos vizinhos e os direitos de cada um.
        
Esse grupo tem o intuito de melhorar o convívio entre os moradores, ajudar e ser ajudado, conhecer os moradores, sugerir melhorias ao condomínio e denunciar abusos que eventualmente possam ocorrer.
        
*Aqui é terminantemente proibido:*
        
❌ Assuntos políticos;
❌ Assuntos religiosos;
❌ Insultos e/ou falta de respeito;
❌ Assuntos, vídeos e imagens não relacionados ao condomínio.
        
No caso de infração a pessoa será imediatamente banida no grupo.`);
    } else {
      msg.reply('Esse comando só pode ser usado em grupo!');
    }
  }


  if (msg.body === '!estacao_california') {

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const dia = ontem.getDate().toString().padStart(2, '0');
    const mes = (ontem.getMonth() + 1).toString().padStart(2, '0'); // Meses começam de 0
    const ano = ontem.getFullYear();

    msg.reply(`*Data: ${dia}/${mes}/${ano}*

Temperatura Máxima (°c):  ${gerarNumeroAleatorio()}
Temperatura Mínima (°c):  ${gerarNumeroAleatorio()}
Umidade Máxima (%):  ${gerarNumeroAleatorio()}
Umidade Mínima (%):  ${gerarNumeroAleatorio()}
Chuva Diária (mm):  ${gerarNumeroAleatorio()}
Chuva Mensal (mm):  ${gerarNumeroAleatorio()}
Evapotranspiração (mm):  ${gerarNumeroAleatorio()}`);
  }

  function gerarNumeroAleatorio() {
    // Gera a parte inteira entre 0 e 30
    let parteInteira = Math.floor(Math.random() * 31);

    // Gera a parte decimal entre 0 e 9
    let parteDecimal = Math.floor(Math.random() * 10);

    // Formata o número no formato desejado
    return `${parteInteira},${parteDecimal}`;
  }


  //FIM
});