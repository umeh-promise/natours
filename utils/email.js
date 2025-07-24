const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1. Create a transporter
  //   const transporter = nodemailer.createTransport({
  //     service: 'Gmail',
  //     auth: {
  //       user: process.env.EMAIL_USERNAME,
  //       passwaord: process.env.EMAIL_PASSWORD,
  //     },
  //     // in youe GMAIL turn on the "less secure app" option
  //   });

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: 'Umeh Promise <dubem@mailinator.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3. Send the email with nodemail
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
