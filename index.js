const express = require("express");
const server_instance = express();
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "product_management.db");
server_instance.use(express.json());
let dataBase = null;
const initialize_DataBase_and_Server = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    server_instance.listen(3001, () => {
      console.log("sever is running on http://localhost:3001");
    });
  } catch (error) {
    console.log(`DataBase Error ${error.message}`);
    process.exit(1);
  }
};

initialize_DataBase_and_Server();

server_instance.get("/products/", async (request, response) => {
  const { search, category, price, page_no } = request.query;
  console.log(!search);
  const limit = 10;
  const offset =
    page_no && !isNaN(page_no) && parseInt(page_no) > 0
      ? limit * (parseInt(page_no) - 1)
      : 0;
  const sortPrice = price === "ASC" || price === "DESC" ? price : "NORMAL";

  let titleCase;
  if (category.indexOf("-") !== -1) {
    titleCase =
      category[0] +
      category.slice(1, category.indexOf("-")).toLowerCase() +
      category[category.indexOf("-")] +
      (category[category.indexOf("-") + 1] +
        category.slice(category.indexOf("-") + 2).toLowerCase());
  } else {
    titleCase =
      category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  try {
    let queryProductDetails;
    let queryParams;

    if (category === "ALL") {
      if (!search) {
        if (sortPrice !== "NORMAL") {
          queryProductDetails = `SELECT * FROM products ORDER BY price ${sortPrice} LIMIT ? OFFSET ?;`;
          queryParams = [limit, offset];
        } else {
          queryProductDetails = `SELECT * FROM products LIMIT ? OFFSET ?;`;
          queryParams = [limit, offset];
        }
      } else {
        if (sortPrice !== "NORMAL") {
          queryProductDetails = `SELECT * FROM products WHERE description LIKE '%' || ? || '%' OR name LIKE '%' || ? || '%' ORDER BY price ${sortPrice} LIMIT ? OFFSET ?;`;
          queryParams = [search, search, limit, offset];
        } else {
          queryProductDetails = `SELECT * FROM products WHERE description LIKE '%' || ? || '%' OR name LIKE '%' || ? || '%' LIMIT ? OFFSET ?;`;
          queryParams = [search, search, limit, offset];
        }
      }
    } else {
      if (!search) {
        if (sortPrice !== "NORMAL") {
          queryProductDetails = `SELECT * FROM products WHERE category = ? ORDER BY price ${sortPrice} LIMIT ? OFFSET ?;`;
          queryParams = [titleCase, limit, offset];
        } else {
          queryProductDetails = `SELECT * FROM products WHERE category = ? LIMIT ? OFFSET ?;`;
          queryParams = [titleCase, limit, offset];
        }
      } else {
        if (sortPrice !== "NORMAL") {
          queryProductDetails = `SELECT * FROM products WHERE (description LIKE '%' || ? || '%' OR name LIKE '%' || ? || '%') AND category = ? ORDER BY price ${sortPrice} LIMIT ? OFFSET ?;`;
          queryParams = [search, search, titleCase, limit, offset];
        } else {
          queryProductDetails = `SELECT * FROM products WHERE (description LIKE '%' || ? || '%' OR name LIKE '%' || ? || '%') AND category = ? LIMIT ? OFFSET ?;`;
          queryParams = [search, search, titleCase, limit, offset];
        }
      }
    }

    const productDetails = await dataBase.all(queryProductDetails, queryParams);

    if (productDetails.length !== 0) {
      response.send(productDetails);
    } else {
      response.status(404).send("No Product Found");
    }
  } catch (error) {
    console.error("Database query error:", error.message);
    response.status(500).send("Internal server error.");
  }
});

server_instance.delete(
  "/products/:product_name/",
  async (request, response) => {
    const { product_name } = request.params;
    const getSelectedTable = `SELECT * FROM products WHERE  name LIKE '%' || ? || '%';`;
    const get_a_table = await dataBase.get(getSelectedTable, [product_name]);
    if (get_a_table === undefined) {
      response.status(404).send(`No product found related to ${product_name}`);
    } else {
      const deleteTableQuery = `DELETE FROM products WHERE name = ?;`;
      await dataBase.run(deleteTableQuery, [get_a_table.name]);
      response.send(`Product Deleted Successfully related to ${product_name}`);
    }
  }
);

server_instance.post("/products/", async (request, response) => {
  const { name, price, category, description } = request.body;

  if (!name || !price || !category || !description) {
    response
      .status(400)
      .send("All fields (name, price, category, description) are required.");
  } else {
    if (!isNaN(price)) {
      try {
        const postUserInput = `INSERT INTO products (name, price, category, description) VALUES (?, ?, ?, ?)`;
        await dataBase.run(postUserInput, [name, price, category, description]);
        response.status(200).send("Product created successfully.");
      } catch (error) {
        console.error("Error inserting product:", error);
        response
          .status(500)
          .send("An error occurred while creating the product.");
      }
    } else {
      response
        .status(404)
        .send("Kindly assign number in price field not word/letter/character");
    }
  }
});

server_instance.put("/products/:product_name/", async (request, response) => {
  const { product_name } = request.params;
  const previousTable = `SELECT * FROM products WHERE name LIKE '%' || ? || '%';`;
  const getPreviousTable = await dataBase.get(previousTable, [product_name]);
  if (getPreviousTable === undefined) {
    response
      .status(404)
      .send(`${product_name} is not in database. Kindly enter valid name`);
    console.log(`${product_name} is not in database. Kindly enter valid name`);
  } else {
    const {
      name = getPreviousTable.name,
      price = getPreviousTable.price,
      category = getPreviousTable.category,
      description = getPreviousTable.description,
    } = request.body;
    const updateTableQuery = `UPDATE products SET name=?, price=?, category=?, description=? WHERE name = ?;`;
    const updateTable = await dataBase.run(updateTableQuery, [
      name,
      price,
      category,
      description,
      getPreviousTable.name,
    ]);
    response.status(200).send("Products Updated Successfully");
    console.log(updateTable);
  }
});
