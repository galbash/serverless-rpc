# Using The Example

# Prerequisites
* In order to compile the thrift IDL file, you need the [Thrift compiler](https://thrift.apache.org/download) installed.
* Node.js version 8.10+
    * NPM package manager
* [AWS CLI](https://aws.amazon.com/cli/) installed on your computer.
* Serverless Framework installed on your computer. You can install it by executing:
`npm install -g serverless`


# Step-By-Step Instructions
1. Generate the service code from the IDL
    1. In the main example directory run the following command: <br>
       `./generate.sh` <br>
       This command will invoke the thrift compiler on the files in the 
       “/thrift” directory inside the example directory and will generate code for all the defined services
1. Deploy the server:
    1. Enter the “server” directory
    1. Execute the command:<br>
       `serverless deploy`<br>
       This command will deploy the Lambda server to AWS.
1. Execute the client 
    1. Enter the "client" directory
    1. Execute the command:<br>
       `node client.js`
    1. The client should execute successfully.
