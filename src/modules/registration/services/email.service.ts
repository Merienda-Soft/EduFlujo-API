export class emailService {
  generateStudentEmail(fullName: string, rude?: string, birthDate?: string): string {
    const initials = fullName.split(' ').map(n => n[0].toLowerCase()).join('').slice(0, 3);
    const yearPart = birthDate ? birthDate.split('-')[0].slice(-3) : '000';
    const idPart = rude ? rude.slice(-3) : Math.floor(10 + Math.random() * 90).toString();
    
    return `${initials}${yearPart}${idPart}@uebhb.edu.bo`;
  }

  generatePassword = () => {
    const letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const number = "0123456789";
    const char = "!@#$%^&*()_+[]{}|;:,.<>?";
  
    const letters = Array.from({ length: 5 }, () => letter.charAt(Math.floor(Math.random() * letter.length)));
    const numbers = Array.from({ length: 4 }, () => number.charAt(Math.floor(Math.random() * number.length)));
    const special = char.charAt(Math.floor(Math.random() * char.length));
    const password = [...letters, ...numbers, special].sort(() => Math.random() - 0.5).join("");

    return password;
  };

  generateMemorablePassword(): string {
    const adjectives = ['Happy', 'Sunny', 'Brave', 'Gentle'];
    const nouns = ['Lion', 'River', 'Mountain', 'Star'];
    const number = Math.floor(Math.random() * 90) + 10;
    const symbol = ['!', '@', '#', '$', '&'][Math.floor(Math.random() * 5)];
    
    const password = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
            nouns[Math.floor(Math.random() * nouns.length)]}${number}${symbol}`;

    return password;
  }
}