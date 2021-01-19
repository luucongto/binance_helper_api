import nodemailer from 'nodemailer'

class MailSender {
  constructor () {
    this.mailTransport = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.MAIL_ACCOUNT,
        pass:  process.env.MAIL_PASS
      }
    })
  }

  send (email, order) {
    if (order.type !== 'REAL') return
    const mailOptions = {
      from: '"Binance Helper" <noreply@binance.helper>',
      to: email
    }
    mailOptions.subject = `${order.mode} ${order.quantity} ${order.pair} ${order.type}: ${order.status === 'done' ? 'processed' : 'placed'}`
    mailOptions.text = `
    Your order has been ${order.status === 'done' ? 'processed' : 'placed'}
    ================================================
      Id: ${order.id}
      Asset: ${order.asset}
      Currency: ${order.currency}
      Price: ${order.price}
      Quantity: ${order.quantity}
      Mode: ${order.mode}
      Type: ${order.type}
      Status: ${order.status}
      Offset: ${order.offset}
      ExpectPrice: ${order.expect_price}
      BinanceOrderId: ${order.binance_order_id}
    `
    return this.mailTransport.sendMail(mailOptions)
    .then(() => {
      console.log('Success send mail to ', email)
    }).catch(error => {
      console.log('Error when send mail', email, JSON.stringify(order), error)
    })
  }
}

const instance = new MailSender()
// Object.freeze(instance)

export default instance
