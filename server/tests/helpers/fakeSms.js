export const sentSms = [];

export const lastCodeSentTo = (phone) => {
  const messages = sentSms.filter((sms) => sms.phone === phone);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return null;
  }

  const match = lastMessage.message.match(/code is (\d{6})/);
  return match ? match[1] : null;
};
