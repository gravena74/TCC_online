export const DOG_BREEDS = [
  "Akita Inu",
  "Basset Hound",
  "Beagle",
  "Bernese Mountain Dog",
  "Border Collie",
  "Boxer",
  "Bull Terrier",
  "Buldogue Francês",
  "Buldogue Inglês",
  "Cavalier King Charles Spaniel",
  "Chihuahua",
  "Chow Chow",
  "Cocker Spaniel",
  "Dachshund (Salsicha)",
  "Dálmata",
  "Doberman",
  "Fila Brasileiro",
  "Golden Retriever",
  "Husky Siberiano",
  "Jack Russell Terrier",
  "Keeshond",
  "Labrador Retriever",
  "Lhasa Apso",
  "Lulu da Pomerânia",
  "Maltês",
  "Pastor Alemão",
  "Pastor Belga",
  "Pequinês",
  "Pinscher",
  "Pit Bull",
  "Pomerânia",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Samoyed",
  "Schnauzer",
  "Shar Pei",
  "Shih Tzu",
  "Spitz Alemão",
  "Sem raça definida",
  "Weimaraner",
  "West Highland White Terrier",
  "Whippet",
  "Yorkshire Terrier",
].sort((a, b) => a.localeCompare(b, "pt-BR"));

export function populateBreedSelect(selectEl, { placeholder = "Selecione a Raça..." } = {}) {
  selectEl.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.textContent = placeholder;
  selectEl.appendChild(placeholderOption);

  for (const breed of DOG_BREEDS) {
    const option = document.createElement("option");
    option.textContent = breed;
    selectEl.appendChild(option);
  }
}
